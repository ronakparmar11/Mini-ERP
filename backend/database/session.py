"""Database engine, session factory, and transaction helpers.

Transaction strategy
--------------------
* `get_db` is the FastAPI request-scoped dependency. It yields a Session and
  guarantees cleanup. It does NOT auto-commit — services control commits.
* Services wrap multi-step ERP workflows in `unit_of_work(db)` so the whole
  flow (e.g. reserve stock + create PO + write audit + write movement) commits
  atomically or rolls back entirely. This is the core of ERP data integrity.
"""
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from utils.config import settings

# pool_pre_ping avoids stale-connection errors after DB restarts.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,  # keep attributes usable after commit for responses
    future=True,
)


def get_db() -> Generator[Session, None, None]:
    """Request-scoped session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def unit_of_work(db: Session) -> Generator[Session, None, None]:
    """Atomic transaction boundary for service-layer workflows.

    Usage:
        with unit_of_work(db):
            ... multiple mutations ...
        # commit happens here; any exception rolls everything back
    """
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
