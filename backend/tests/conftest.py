"""Pytest fixtures: isolated in-memory SQLite DB + authenticated test client.

Using SQLite (in-memory) keeps tests fast and infra-free for the hackathon.
The service layer is DB-agnostic, so workflow correctness verified here holds
on PostgreSQL too (row-level locking is the only behavioural difference).
"""
import os

# Point the app's default engine at SQLite BEFORE importing any app module, so
# importing database.session does not require the Postgres driver (psycopg2).
# Test fixtures still build their own isolated in-memory engine below.
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database.base import Base
from database.session import get_db
import models  # noqa: F401  register all tables
from main import create_app
from models.user import User
from utils.enums import Role
from utils.security import hash_password


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # one shared in-memory connection
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False,
                                  expire_on_commit=False)
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def admin_user(db_session):
    user = User(name="Admin", email="admin@test.com",
                password_hash=hash_password("pw"), role=Role.ADMIN)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def client(db_session):
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


@pytest.fixture()
def auth_headers(client, admin_user):
    resp = client.post("/api/v1/auth/login",
                       json={"email": "admin@test.com", "password": "pw"})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
