"""Domain-level exceptions.

Services raise these typed errors instead of HTTPException, keeping the service
layer framework-agnostic. The error-handling middleware maps each to an HTTP
status code. This separation means services can be reused outside FastAPI
(workers, CLIs, tests) without dragging HTTP semantics along.
"""


class ERPException(Exception):
    """Base class for all domain errors. `status_code` drives the HTTP mapping."""
    status_code: int = 400
    code: str = "erp_error"

    def __init__(self, message: str | None = None):
        self.message = message or self.__class__.__doc__ or "ERP error"
        super().__init__(self.message)


class NotFoundError(ERPException):
    """Requested resource does not exist."""
    status_code = 404
    code = "not_found"


class ValidationError(ERPException):
    """Input or state is invalid for the requested operation."""
    status_code = 422
    code = "validation_error"


class BusinessRuleError(ERPException):
    """A domain/business rule was violated (e.g. illegal status transition)."""
    status_code = 409
    code = "business_rule_violation"


class InsufficientStockError(BusinessRuleError):
    """Not enough free-to-use quantity to satisfy the operation."""
    code = "insufficient_stock"


class AuthenticationError(ERPException):
    """Invalid credentials or token."""
    status_code = 401
    code = "authentication_error"


class PermissionDeniedError(ERPException):
    """Authenticated user lacks the required permission."""
    status_code = 403
    code = "permission_denied"
