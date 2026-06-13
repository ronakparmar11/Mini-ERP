"""Seed script — realistic hackathon demo dataset for a furniture manufacturer.

Generates a full, believable Order-to-Cash dataset by driving the EXISTING
services (Product/BoM/Purchase/Manufacturing/Sales/Invoice/Email), so every
inventory movement and audit log is produced exactly as in real usage. No
business logic is modified here.

Run (from the backend/ directory):
    python -m scripts.seed

Idempotency: if the primary admin already exists the script skips entirely, so
re-running never duplicates data. For a clean re-seed, drop/recreate the DB
(or point DATABASE_URL at a fresh database) and run again.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from database.base import Base
from database.session import SessionLocal, engine
import models  # noqa: F401  ensures all tables are registered
from models.user import User
from schemas.bom import BoMComponentCreate, BoMCreate, BoMOperationCreate
from schemas.manufacturing import ManufacturingOrderCreate, ProduceRequest
from schemas.product import ProductCreate
from schemas.purchase import PurchaseOrderCreate, PurchaseOrderLineCreate, ReceiptRequest
from schemas.sales import DeliveryRequest, SalesOrderCreate, SalesOrderLineCreate
from services.bom_service import BoMService
from services.email_service import EmailService
from services.invoice_service import InvoiceService
from services.manufacturing_service import ManufacturingService
from services.product_service import ProductService
from services.purchase_service import PurchaseService
from services.sales_service import SalesService
from utils.enums import (
    InvoiceStatus, ManufacturingOrderStatus, ProcurementMethod,
    PurchaseOrderStatus, Role, SalesOrderStatus,
)
from utils.security import hash_password

PRIMARY_ADMIN_EMAIL = "admin@example.com"
PURCHASE = ProcurementMethod.PURCHASE
MANUFACTURE = ProcurementMethod.MANUFACTURE


def _make_user(db, name, email, role) -> User:
    u = User(name=name, email=email, password_hash=hash_password("password123"), role=role)
    db.add(u)
    return u


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == PRIMARY_ADMIN_EMAIL).first():
            print("Seed data already present — skipping.")
            return

        # ── 1. USERS ───────────────────────────────────────────────────────
        admins = [
            _make_user(db, "Asha Menon", PRIMARY_ADMIN_EMAIL, Role.ADMIN),
            _make_user(db, "Ravi Kapoor", "admin2@example.com", Role.ADMIN),
        ]
        operators = [
            _make_user(db, "Neha Sharma", "operator1@example.com", Role.SYSTEM_USER),
            _make_user(db, "Imran Qureshi", "operator2@example.com", Role.SYSTEM_USER),
            _make_user(db, "Leah Fernandes", "operator3@example.com", Role.SYSTEM_USER),
        ]
        vendor_names = [
            "TimberLine Supplies", "SteelCraft Hardware", "ComfortFoam Co.",
            "WeaveWell Textiles", "FinishPro Coatings",
        ]
        vendors = [
            _make_user(db, vn, f"vendor{i+1}@example.com", Role.SYSTEM_USER)
            for i, vn in enumerate(vendor_names)
        ]
        db.add_all(admins + operators + vendors)
        db.commit()
        for u in admins + operators + vendors:
            db.refresh(u)
        uid = admins[0].id
        products_svc = ProductService(db)

        # ── 2. PRODUCTS ────────────────────────────────────────────────────
        # 15 raw materials (PURCHASE). 3 deliberately low-stock (qty 3) and not
        # refilled, to populate Low Stock Alerts. Rest are plentiful.
        raw_specs = [
            ("Oak Plank", 14, 240), ("Pine Plank", 9, 300), ("Plywood Sheet", 18, 180),
            ("MDF Board", 12, 200), ("Steel Leg", 7, 400), ("Screws (box)", 3, 500),
            ("Wood Glue (bottle)", 4, 260), ("Foam Padding", 11, 220),
            ("Fabric Roll", 22, 160), ("Leather Hide", 45, 120),
            ("Drawer Slide", 6, 300), ("Varnish (litre)", 8, 200),
            ("Cabinet Hinge", 2, 3),   # low stock
            ("Caster Wheel", 3, 3),    # low stock
            ("Wood Dowel", 1, 40),
        ]
        raw: dict[str, int] = {}
        for i, (name, cost, qty) in enumerate(raw_specs):
            p = products_svc.create(ProductCreate(
                name=name, cost_price=cost, sales_price=0, on_hand_qty=qty,
                procurement_method=PURCHASE, procure_on_demand=True,
                vendor_id=vendors[i % len(vendors)].id,
            ), user_id=uid)
            raw[name] = p.id

        # 10 finished goods (MANUFACTURE). `pod` toggles auto-procurement.
        # (name, sales_price, cost_price, opening_stock, procure_on_demand)
        fg_specs = [
            ("Dining Table", 520, 210, 60, True),
            ("Office Chair", 180, 70, 60, True),
            ("Bookshelf", 240, 95, 60, True),
            ("Bed Frame", 460, 190, 60, True),
            ("Wardrobe", 780, 320, 60, True),
            ("Coffee Table", 160, 60, 6, False),   # "delivering" order #1
            ("Sofa (3-seater)", 900, 380, 20, False),  # "delivering" order #2
            ("Nightstand", 130, 50, 0, True),      # shortage → auto-MO
            ("Desk", 300, 120, 18, True),
            ("Dresser", 540, 220, 0, False),       # shortage → no auto-gen
        ]
        fg: dict[str, int] = {}
        for name, sp, cp, qty, pod in fg_specs:
            p = products_svc.create(ProductCreate(
                name=name, sales_price=sp, cost_price=cp, on_hand_qty=qty,
                procurement_method=MANUFACTURE, procure_on_demand=pod,
            ), user_id=uid)
            fg[name] = p.id

        # ── 3. BILLS OF MATERIALS (one per finished good, 3–5 components) ───
        bom_svc = BoMService(db)
        # Produced/started FGs use only high-stock raws (never the low ones), so
        # production cannot drive low-stock raws negative.
        safe_raws = ["Oak Plank", "Pine Plank", "Plywood Sheet", "MDF Board",
                     "Steel Leg", "Screws (box)", "Wood Glue (bottle)",
                     "Foam Padding", "Fabric Roll", "Leather Hide",
                     "Drawer Slide", "Varnish (litre)"]
        bom_recipes = {
            "Dining Table": [("Oak Plank", 4), ("Steel Leg", 4), ("Screws (box)", 1), ("Varnish (litre)", 1)],
            "Office Chair": [("Steel Leg", 5), ("Foam Padding", 2), ("Fabric Roll", 1), ("Screws (box)", 1)],
            "Bookshelf": [("Plywood Sheet", 3), ("MDF Board", 2), ("Wood Glue (bottle)", 1), ("Screws (box)", 1)],
            "Bed Frame": [("Oak Plank", 6), ("Plywood Sheet", 2), ("Screws (box)", 2)],
            "Wardrobe": [("MDF Board", 5), ("Plywood Sheet", 3), ("Drawer Slide", 2), ("Screws (box)", 2)],
            "Sofa (3-seater)": [("Pine Plank", 4), ("Foam Padding", 6), ("Leather Hide", 2), ("Fabric Roll", 1)],
            "Desk": [("Oak Plank", 3), ("Steel Leg", 4), ("Wood Glue (bottle)", 1)],
            # The next three are NOT produced; they reference the low-stock raws
            # (realistic) but production never runs, so stock stays untouched.
            "Coffee Table": [("Pine Plank", 2), ("Wood Dowel", 4), ("Varnish (litre)", 1)],
            "Nightstand": [("Pine Plank", 2), ("Cabinet Hinge", 2), ("Wood Glue (bottle)", 1)],
            "Dresser": [("MDF Board", 3), ("Drawer Slide", 4), ("Caster Wheel", 4), ("Cabinet Hinge", 2)],
        }
        bom_id: dict[str, int] = {}
        ops_pool = ["Cutting", "Assembly", "Sanding", "Finishing", "QA"]
        for fname, comps in bom_recipes.items():
            b = bom_svc.create(BoMCreate(
                finished_product_id=fg[fname], quantity=1,
                components=[BoMComponentCreate(component_product_id=raw[c], quantity_required=q)
                            for c, q in comps],
                operations=[BoMOperationCreate(work_center=ops_pool[i % len(ops_pool)],
                                               expected_duration=20 + 10 * i)
                            for i in range(2)],
            ), user_id=uid)
            bom_id[fname] = b.id
        _ = safe_raws  # documented intent

        # ── 4. PURCHASE ORDERS (8: 2 Draft, 1 Awaiting, 5 Received) ─────────
        # Created BEFORE sales orders so goods-receipt re-allocation is a no-op.
        po_svc = PurchaseService(db)

        def make_po(vendor_name, items):  # items: [(raw_name, qty, cost)]
            return po_svc.create(PurchaseOrderCreate(
                vendor=vendor_name, responsible_person=operators[0].name,
                lines=[PurchaseOrderLineCreate(product_id=raw[n], ordered_quantity=q, cost_price=c)
                       for n, q, c in items],
            ), user_id=uid)

        # 5 fully received (replenish plentiful raws — never the low-stock ones).
        for n in ["Oak Plank", "Pine Plank", "Plywood Sheet", "Steel Leg", "Fabric Roll"]:
            po = make_po(vendor_names[0], [(n, 50, 10)])
            po_svc.confirm(po.id, user_id=uid)
            po_svc.receive(po.id, ReceiptRequest(), user_id=uid)
        # 1 awaiting receipt (partially received).
        po_partial = make_po(vendor_names[1], [("MDF Board", 40, 12)])
        po_svc.confirm(po_partial.id, user_id=uid)
        po_svc.receive(po_partial.id, ReceiptRequest(
            lines=[{"line_id": po_partial.lines[0].id, "quantity": 15}]), user_id=uid)
        # 2 drafts (left unconfirmed).
        make_po(vendor_names[2], [("Foam Padding", 30, 11)])
        make_po(vendor_names[3], [("Leather Hide", 10, 45)])

        # ── 5. MANUFACTURING ORDERS (8 explicit; +2 auto from sales later) ──
        # Produced/started FGs are NOT sold short, so production never re-reserves
        # into a waiting sales order. Done before sales orders for the same reason.
        mo_svc = ManufacturingService(db)

        def make_mo(fname, qty, assignee):
            return mo_svc.create(ManufacturingOrderCreate(
                bom_id=bom_id[fname], quantity_to_produce=qty, assignee=assignee,
                schedule_date=datetime.utcnow() + timedelta(days=2),
            ), user_id=uid)

        # 4 DONE (produce extra stock of non-shortage goods).
        for fname in ["Dining Table", "Office Chair", "Bookshelf", "Bed Frame"]:
            mo = make_mo(fname, 2, operators[1].name)
            mo_svc.confirm(mo.id, user_id=uid)
            mo_svc.start(mo.id, user_id=uid)
            mo_svc.produce(mo.id, ProduceRequest(), user_id=uid)
        # 3 IN_PROGRESS.
        for fname in ["Wardrobe", "Desk", "Sofa (3-seater)"]:
            mo = make_mo(fname, 3, operators[2].name)
            mo_svc.confirm(mo.id, user_id=uid)
            mo_svc.start(mo.id, user_id=uid)
        # 1 DRAFT.
        make_mo("Office Chair", 4, operators[0].name)

        # ── 6. SALES ORDERS (20) ───────────────────────────────────────────
        so_svc = SalesService(db)
        customers = [
            ("Homestead Living", "orders@homesteadliving.test"),
            ("Urban Nest Decor", "buy@urbannest.test"),
            ("CozyCraft Interiors", "po@cozycraft.test"),
            ("Maple & Co.", "accounts@mapleco.test"),
            ("The Loft Studio", "hello@loftstudio.test"),
            ("Nordic Home", "purchasing@nordichome.test"),
            ("Casa Bella", "orders@casabella.test"),
            ("Greenwood Furnishings", "info@greenwood.test"),
        ]
        cidx = {"n": 0}

        def make_so(fname, qty):
            c = customers[cidx["n"] % len(customers)]
            cidx["n"] += 1
            return so_svc.create(SalesOrderCreate(
                customer_name=c[0], customer_email=c[1],
                lines=[SalesOrderLineCreate(product_id=fg[fname], ordered_quantity=qty)],
            ), user_id=uid)

        # 5 Confirmed & FULLY reserved (ample stock) → Ready to Deliver.
        for fname in ["Dining Table", "Office Chair", "Bookshelf", "Bed Frame", "Wardrobe"]:
            so = make_so(fname, 5)
            so_svc.confirm(so.id, user_id=uid)

        # 5 Delivered (confirm fully, then deliver everything).
        delivered_ids = []
        for fname in ["Dining Table", "Office Chair", "Bookshelf", "Bed Frame", "Wardrobe"]:
            so = make_so(fname, 4)
            so_svc.confirm(so.id, user_id=uid)
            so = so_svc.deliver(so.id, DeliveryRequest(), user_id=uid)
            delivered_ids.append(so.id)

        # 2 Delivering (PARTIALLY_DELIVERED, remainder NOT fully reserved so they
        # stay OUT of "Ready to Deliver"). Each is a shortage at confirm, then a
        # partial shipment of the reserved quantity.
        for fname, order_qty, ship_qty in [("Coffee Table", 10, 2), ("Sofa (3-seater)", 26, 4)]:
            so = make_so(fname, order_qty)
            so_svc.confirm(so.id, user_id=uid)
            so_svc.deliver(so.id, DeliveryRequest(
                lines=[{"line_id": so.lines[0].id, "quantity": ship_qty}]), user_id=uid)

        # 5 Confirmed WITH shortages.
        #   2 on Nightstand (POD on, stock 0) → each auto-creates a draft MO.
        for _ in range(2):
            so = make_so("Nightstand", 6)
            so_svc.confirm(so.id, user_id=uid)
        #   3 on Dresser (POD off, stock 0) → shortage left unreserved, no auto-gen.
        for _ in range(3):
            so = make_so("Dresser", 5)
            so_svc.confirm(so.id, user_id=uid)

        # 3 Draft (created only).
        for fname in ["Dining Table", "Office Chair", "Desk"]:
            make_so(fname, 2)

        # ── 7. INVOICES (one per delivered SO; mix Draft + Sent) ────────────
        inv_svc = InvoiceService(db)
        email_svc = EmailService(db)
        for i, so_id in enumerate(delivered_ids):
            inv = inv_svc.generate_invoice(so_id, user_id=uid)
            if i < 3:  # send the first 3, leave the rest as DRAFT awaiting dispatch
                email_svc.send_invoice_email(inv.id, user_id=uid)

        _report(db)
        print("\nLogin: admin@example.com / password123  (all users share password123)")
    finally:
        db.close()


def _report(db) -> None:
    """Print the dashboard-relevant counts so the demo state is verifiable."""
    from models.invoice import Invoice
    from models.manufacturing import ManufacturingOrder
    from models.product import Product
    from models.purchase import PurchaseOrder
    from models.sales import SalesOrder

    pending_po = db.query(PurchaseOrder).filter(PurchaseOrder.status.in_([
        PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CONFIRMED,
        PurchaseOrderStatus.PARTIALLY_RECEIVED])).count()
    pending_mo_non_ip = db.query(ManufacturingOrder).filter(
        ManufacturingOrder.status.in_([ManufacturingOrderStatus.DRAFT,
                                       ManufacturingOrderStatus.CONFIRMED])).count()
    in_production = db.query(ManufacturingOrder).filter(
        ManufacturingOrder.status == ManufacturingOrderStatus.IN_PROGRESS).count()
    ready = 0
    for so in db.query(SalesOrder).filter(SalesOrder.status.in_([
            SalesOrderStatus.CONFIRMED, SalesOrderStatus.PARTIALLY_DELIVERED])).all():
        outstanding = any(l.remaining_to_deliver > 1e-9 for l in so.lines)
        all_reserved = all(float(l.reserved_quantity) + 1e-9 >= l.remaining_to_deliver
                           for l in so.lines)
        if outstanding and all_reserved:
            ready += 1
    awaiting_dispatch = db.query(Invoice).filter(Invoice.status == InvoiceStatus.DRAFT).count()
    low_stock = sum(1 for p in db.query(Product).all() if p.free_to_use_qty <= 5)

    print("\n-- Dashboard Action Center (target ranges) --")
    print(f"  Needs Procurement          : {pending_po + pending_mo_non_ip}  (target 3-6)")
    print(f"  In Production              : {in_production}  (target 2-4)")
    print(f"  Ready to Deliver           : {ready}  (target 3-6)")
    print(f"  Invoices Awaiting Dispatch : {awaiting_dispatch}  (target 2-5)")
    print(f"  Low Stock Alerts           : {low_stock}  (target 3-6)")
    print("-- Totals --")
    print(f"  Products: {db.query(Product).count()} | "
          f"SOs: {db.query(SalesOrder).count()} | "
          f"POs: {db.query(PurchaseOrder).count()} | "
          f"MOs: {db.query(ManufacturingOrder).count()} | "
          f"Invoices: {db.query(Invoice).count()}")


if __name__ == "__main__":
    seed()
