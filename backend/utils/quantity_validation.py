"""Shared quantity validation for integer-only inventory enforcement.

All inventory quantities must be whole numbers. This module provides a Pydantic
validator that can be reused across schemas and a plain function for service-layer
checks (e.g. Excel imports, OCR imports).
"""
from utils.exceptions import ValidationError

_QUANTITY_ERROR = "Quantities must be whole numbers. Decimal values are not supported."


def assert_whole_number(value: float, *, label: str = "Quantity") -> None:
    """Raise a domain ValidationError if the value is not a whole number."""
    if value % 1 != 0:
        raise ValidationError(_QUANTITY_ERROR)


def validate_whole_quantity(value: float) -> float:
    """Pydantic field validator: reject non-integer quantities."""
    if value % 1 != 0:
        raise ValueError(_QUANTITY_ERROR)
    return value
