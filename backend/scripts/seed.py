"""Seed script — bootstrap an admin user + sample ERP data.

For a hackathon this also calls create_all() so you can run WITHOUT Alembic if
Postgres migrations aren't set up yet. Run:
    python -m scripts.seed         (from the backend/ directory)
"""
from database.base import Base
from database.session import SessionLocal, engine
from models.bom import BillOfMaterials, BoMComponent, BoMOperation
from models.product import Product
from models.user import User
import models  # noqa: F401  ensures all tables are registered
from utils.enums import ProcurementMethod, Role
from utils.security import hash_password


def seed() -> None:
    # Convenience for hackathon: create tables if they don't exist.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "admin@example.com").first():
            print("Seed data already present — skipping.")
            return

        admin = User(name="Admin", email="admin@example.com",
                     password_hash=hash_password("admin123"), role=Role.ADMIN)
        operator = User(name="Operator", email="user@example.com",
                        password_hash=hash_password("user123"), role=Role.SYSTEM_USER)
        vendor = User(name="Acme Supplies", email="vendor@example.com",
                      password_hash=hash_password("vendor123"), role=Role.SYSTEM_USER)
        db.add_all([admin, operator, vendor])
        db.flush()

        # Raw materials (procured by purchase).
        wood = Product(name="Wood Plank", sales_price=0, cost_price=5,
                       on_hand_qty=100, procurement_method=ProcurementMethod.PURCHASE,
                       procure_on_demand=True, vendor_id=vendor.id)
        screws = Product(name="Screws (box)", sales_price=0, cost_price=2,
                         on_hand_qty=200, procurement_method=ProcurementMethod.PURCHASE,
                         procure_on_demand=True, vendor_id=vendor.id)
        # Finished good (manufactured).
        table = Product(name="Wooden Table", sales_price=120, cost_price=40,
                        on_hand_qty=2,
                        procurement_method=ProcurementMethod.MANUFACTURE,
                        procure_on_demand=True)
        db.add_all([wood, screws, table])
        db.flush()

        # BoM: 1 table = 4 wood planks + 1 box of screws + 30 min assembly.
        bom = BillOfMaterials(finished_product_id=table.id, quantity=1)
        bom.components.append(BoMComponent(component_product_id=wood.id, quantity_required=4))
        bom.components.append(BoMComponent(component_product_id=screws.id, quantity_required=1))
        bom.operations.append(BoMOperation(work_center="Assembly", expected_duration=30))
        db.add(bom)

        db.commit()
        print("Seeded: admin@example.com / admin123, user@example.com / user123")
        print(f"Products: wood={wood.id}, screws={screws.id}, table={table.id}, BoM={bom.id}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
