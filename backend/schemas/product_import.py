from pydantic import BaseModel


class ImportDuplicate(BaseModel):
    row: int
    product_name: str


class ImportError(BaseModel):
    row: int
    field: str
    message: str


class ImportRow(BaseModel):
    """One previewed/processed row for the review table."""
    row: int
    product_name: str
    status: str  # "valid" | "created" | "duplicate" | "error"
    reason: str | None = None


class ImportResult(BaseModel):
    success_count: int           # valid (preview) or created (commit) rows
    failure_count: int           # rows with validation errors
    duplicate_count: int
    duplicates: list[ImportDuplicate]
    errors: list[ImportError]
    rows: list[ImportRow]        # full per-row result for the UI table
    committed: bool              # False = dry-run validation, True = imported
