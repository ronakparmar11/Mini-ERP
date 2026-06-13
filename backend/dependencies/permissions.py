"""RBAC permission catalogue and role→permission mapping.

Permissions are namespaced strings: "<module>:<action>". Routes declare the
permission they need; the role map decides who holds it. ADMIN is a superuser
(implicitly holds every permission). SYSTEM_USER holds an explicit grant set —
edit DEFAULT_SYSTEM_USER_PERMISSIONS to tune what a standard user can do.
"""
from utils.enums import Role


class P:
    """Permission constants (single source of truth, referenced by routes)."""
    # Sales
    SALES_CREATE = "sales:create"
    SALES_VIEW = "sales:view"
    SALES_EDIT = "sales:edit"
    SALES_DELETE = "sales:delete"
    SALES_CONFIRM = "sales:confirm"

    # Purchase
    PURCHASE_CREATE = "purchase:create"
    PURCHASE_VIEW = "purchase:view"
    PURCHASE_EDIT = "purchase:edit"
    PURCHASE_DELETE = "purchase:delete"
    PURCHASE_CONFIRM = "purchase:confirm"

    # Manufacturing
    MANUFACTURING_CREATE = "manufacturing:create"
    MANUFACTURING_VIEW = "manufacturing:view"
    MANUFACTURING_EDIT = "manufacturing:edit"
    MANUFACTURING_DELETE = "manufacturing:delete"
    MANUFACTURING_PRODUCE = "manufacturing:produce"

    # Products
    PRODUCTS_CREATE = "products:create"
    PRODUCTS_VIEW = "products:view"
    PRODUCTS_EDIT = "products:edit"
    PRODUCTS_DELETE = "products:delete"

    # Invoicing (assisted Order-to-Cash)
    INVOICE_VIEW = "invoice:view"
    INVOICE_CREATE = "invoice:create"  # generate an invoice for a delivered SO
    INVOICE_SEND = "invoice:send"      # email the invoice to the customer

    # Cross-cutting (admin-only by default)
    USERS_MANAGE = "users:manage"
    AUDIT_VIEW = "audit:view"


ALL_PERMISSIONS: set[str] = {
    v for k, v in vars(P).items() if not k.startswith("_") and isinstance(v, str)
}

# A standard System User can run the full operational workflow but cannot
# manage users. Tighten/loosen here as the business requires.
DEFAULT_SYSTEM_USER_PERMISSIONS: set[str] = ALL_PERMISSIONS - {P.USERS_MANAGE}


def permissions_for_role(role: Role) -> set[str]:
    if role == Role.ADMIN:
        return set(ALL_PERMISSIONS)  # superuser
    return set(DEFAULT_SYSTEM_USER_PERMISSIONS)
