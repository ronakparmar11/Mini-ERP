"""Application configuration loaded from environment variables.

Uses pydantic-settings so config is validated at startup and typed everywhere.
Keep ALL tunables here so deployment is a matter of changing env vars only.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Application ---
    APP_NAME: str = "Mini ERP"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # --- Database ---
    # Example: postgresql+psycopg2://erp:erp@localhost:5432/mini_erp
    DATABASE_URL: str = "postgresql+psycopg2://erp:erp@localhost:5432/mini_erp"

    # --- JWT / Security ---
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PROD_super_secret_key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8h dev token, shorten in prod

    # --- Business rules (tunable defaults) ---
    LOW_STOCK_THRESHOLD: float = 5.0  # used by dashboard "low stock" report

    # --- Invoicing (assisted Order-to-Cash) ---
    COMPANY_NAME: str = "Mini ERP"  # printed on invoice PDFs
    # Where generated invoice PDFs are stored on disk (created if missing).
    INVOICE_STORAGE_DIR: str = "generated_invoices"
    # Resend transactional email. If RESEND_API_KEY is blank the email service
    # runs in dev/simulation mode (no network call) so the flow stays demoable.
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "Mini ERP <onboarding@resend.dev>"

    # --- AI-assisted order import (Groq, OpenAI-compatible API) ---
    # NOTE: env var is lower-case `groq_api_key` (see .env).
    groq_api_key: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Cached singleton so we don't re-parse the environment on every import."""
    return Settings()


settings = get_settings()
