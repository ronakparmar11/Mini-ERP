"""InventoryService — the ONLY component allowed to change product stock.

Every on_hand / reserved mutation flows through `apply_movement`, which:
  1. validates the resulting stock stays non-negative,
  2. updates the product counters,
  3. writes an immutable InventoryMovement ledger row.

This guarantees 100% traceability: there is no code path that changes stock
without leaving a movement record. Callers must already be inside a
`unit_of_work` transaction so the counter update and the ledger row commit
together.
"""
from __future__ import annotations

from sqlalchemy.orm import Session, lazyload

from models.inventory import InventoryMovement
from models.product import Product
from models.sales import SalesOrder, SalesOrderLine
from utils.enums import MovementType, ReferenceType, SalesOrderStatus
from utils.exceptions import InsufficientStockError, NotFoundError


class InventoryService:
    def __init__(self, db: Session):
        self.db = db

    def _get_product_locked(self, product_id: int) -> Product:
        """Load a product FOR UPDATE to prevent concurrent stock races.

        with_for_update takes a row lock so two simultaneous deliveries can't
        both read the same on_hand and oversell. Falls back gracefully on
        SQLite (tests) where row locks are a no-op.
        """
        # NOTE: Product.vendor is mapped lazy="joined", which would emit a
        # LEFT OUTER JOIN to users on every query. Postgres cannot apply
        # FOR UPDATE to the nullable side of an outer join, so we:
        #   1) override the eager load with lazyload() -> no join is emitted, and
        #   2) scope the lock with of=Product as defense-in-depth.
        # The vendor relationship is not needed to reserve/lock stock.
        product = (
            self.db.query(Product)
            .filter(Product.id == product_id)
            .options(lazyload(Product.vendor))
            .with_for_update(of=Product)
            .first()
        )
        if product is None:
            raise NotFoundError(f"Product {product_id} not found")
        return product

    def apply_movement(
        self,
        *,
        product_id: int,
        movement_type: MovementType,
        quantity: float,
        reference_type: ReferenceType,
        reference_id: int,
        user_id: int | None,
        on_hand_delta: float = 0.0,
        reserved_delta: float = 0.0,
    ) -> InventoryMovement:
        """Apply a stock change + record it.

        `quantity` is the absolute magnitude logged on the ledger.
        `on_hand_delta` / `reserved_delta` are the signed changes to apply to
        the product counters (caller decides the semantics per movement type).
        """
        product = self._get_product_locked(product_id)

        new_on_hand = float(product.on_hand_qty) + on_hand_delta
        new_reserved = float(product.reserved_qty) + reserved_delta

        # --- Stock invariants -------------------------------------------------
        if new_on_hand < 0:
            raise InsufficientStockError(
                f"On-hand for product {product_id} cannot go negative "
                f"({product.on_hand_qty} + {on_hand_delta})"
            )
        if new_reserved < 0:
            raise InsufficientStockError(
                f"Reserved for product {product_id} cannot go negative "
                f"({product.reserved_qty} + {reserved_delta})"
            )

        product.on_hand_qty = new_on_hand
        product.reserved_qty = new_reserved

        movement = InventoryMovement(
            product_id=product_id,
            quantity=abs(quantity),
            movement_type=movement_type,
            reference_type=reference_type,
            reference_id=reference_id,
            user_id=user_id,
        )
        self.db.add(movement)
        self.db.flush()  # assign movement.id without committing the outer txn
        return movement

    # ---- Convenience wrappers that encode each movement's stock semantics ----

    def reserve_for_sale(self, product_id, qty, so_id, user_id):
        """SALE_RESERVATION: reserved += qty (on_hand unchanged)."""
        return self.apply_movement(
            product_id=product_id, movement_type=MovementType.SALE_RESERVATION,
            quantity=qty, reference_type=ReferenceType.SALES_ORDER,
            reference_id=so_id, user_id=user_id, reserved_delta=+qty,
        )

    def deliver_sale(self, product_id, qty, so_id, user_id):
        """SALE_DELIVERY: on_hand -= qty and reserved -= qty."""
        return self.apply_movement(
            product_id=product_id, movement_type=MovementType.SALE_DELIVERY,
            quantity=qty, reference_type=ReferenceType.SALES_ORDER,
            reference_id=so_id, user_id=user_id,
            on_hand_delta=-qty, reserved_delta=-qty,
        )

    def receive_purchase(self, product_id, qty, po_id, user_id):
        """PURCHASE_RECEIPT: on_hand += qty."""
        return self.apply_movement(
            product_id=product_id, movement_type=MovementType.PURCHASE_RECEIPT,
            quantity=qty, reference_type=ReferenceType.PURCHASE_ORDER,
            reference_id=po_id, user_id=user_id, on_hand_delta=+qty,
        )

    def consume_for_manufacturing(self, product_id, qty, mo_id, user_id):
        """MO_CONSUMPTION: raw material on_hand -= qty."""
        return self.apply_movement(
            product_id=product_id, movement_type=MovementType.MO_CONSUMPTION,
            quantity=qty, reference_type=ReferenceType.MANUFACTURING_ORDER,
            reference_id=mo_id, user_id=user_id, on_hand_delta=-qty,
        )

    def produce_finished_good(self, product_id, qty, mo_id, user_id):
        """MO_PRODUCTION: finished good on_hand += qty."""
        return self.apply_movement(
            product_id=product_id, movement_type=MovementType.MO_PRODUCTION,
            quantity=qty, reference_type=ReferenceType.MANUFACTURING_ORDER,
            reference_id=mo_id, user_id=user_id, on_hand_delta=+qty,
        )

    # ---- Supply re-allocation (shared by purchase receipt + MO production) ---

    def reallocate_reservations(self, product_id: int, user_id: int | None) -> float:
        """Reserve newly available free stock of a product against waiting demand.

        Invoked after ANY supply event that raises free-to-use stock — a goods
        receipt (PurchaseService.receive) or a production run
        (ManufacturingService.produce) — so freshly available stock is committed
        back to the Sales Orders that were short at confirmation time, instead of
        lingering as free stock.

        Rules:
          * Only CONFIRMED / PARTIALLY_DELIVERED orders are eligible.
          * Allocate to the oldest eligible orders first (FIFO).
          * Per line, fill only `remaining_to_reserve` = ordered − delivered −
            reserved, so an already-reserved quantity is never reserved twice.
          * Never reserve more than the free-to-use stock on hand.

        Must run inside an existing transaction (the caller's unit_of_work);
        each reservation writes a SALE_RESERVATION inventory movement.
        Returns the total quantity newly reserved.
        """
        product = self.db.get(Product, product_id)
        if product is None:
            return 0.0

        available = product.free_to_use_qty  # on_hand − reserved (incl. new units)
        if available <= 1e-9:
            return 0.0

        eligible_lines = (
            self.db.query(SalesOrderLine)
            .join(SalesOrder, SalesOrderLine.order_id == SalesOrder.id)
            .filter(
                SalesOrderLine.product_id == product_id,
                SalesOrder.status.in_([
                    SalesOrderStatus.CONFIRMED,
                    SalesOrderStatus.PARTIALLY_DELIVERED,
                ]),
            )
            .order_by(  # FIFO: oldest orders first
                SalesOrder.creation_date.asc(),
                SalesOrder.id.asc(),
                SalesOrderLine.id.asc(),
            )
            .all()
        )

        total_allocated = 0.0
        for line in eligible_lines:
            if available <= 1e-9:
                break
            needed = line.remaining_to_reserve
            if needed <= 1e-9:
                continue
            alloc = min(needed, available)
            if alloc <= 1e-9:
                continue
            # reserved += alloc and record the SALE_RESERVATION movement.
            self.reserve_for_sale(
                product_id=product_id, qty=alloc,
                so_id=line.order_id, user_id=user_id,
            )
            line.reserved_quantity = float(line.reserved_quantity) + alloc
            available -= alloc
            total_allocated += alloc

        return total_allocated

    # ---- Read helpers --------------------------------------------------------

    def list_movements(self, product_id: int | None = None, limit: int = 200):
        q = self.db.query(InventoryMovement)
        if product_id is not None:
            q = q.filter(InventoryMovement.product_id == product_id)
        return q.order_by(InventoryMovement.timestamp.desc()).limit(limit).all()
