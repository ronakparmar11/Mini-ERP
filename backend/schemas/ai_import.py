from pydantic import BaseModel


class ImportedItem(BaseModel):
    """One extracted order line. The matched_* fields pre-select the product
    dropdown on the frontend review screen (null = no confident match)."""
    product_name: str
    quantity: float
    matched_product_id: int | None = None
    matched_product_name: str | None = None


class ImportedOrder(BaseModel):
    """AI-extracted order, returned for human review BEFORE any Sales Order is
    created. Creation still goes through the normal POST /sales-orders flow."""
    customer_name: str | None = None
    email: str | None = None
    address: str | None = None
    items: list[ImportedItem] = []
