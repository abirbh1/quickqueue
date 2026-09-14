import os

# Must be set before quickqueue_backend.db is first imported (it reads this
# at module load time), so the app's lifespan never touches a real file on
# disk during tests, even though it isn't the engine the tests actually
# exercise (see the `client` fixture override below).
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from quickqueue_backend.db import Base, get_session
from quickqueue_backend.main import app


@pytest.fixture
def session_factory():
    """A sessionmaker bound to a fresh, isolated in-memory SQLite database."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    yield factory
    engine.dispose()


@pytest.fixture
def db_session(session_factory) -> Session:
    """Direct DB access for tests that need to seed rows the HTTP API can't
    produce (e.g. a party with a specific check-in time, for report tests)."""
    session = session_factory()
    yield session
    session.close()


@pytest.fixture
def client(session_factory):
    def override_get_session():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def check_in(client: TestClient, name: str = "Alvarez", party_size: int = 2, phone: str | None = None) -> dict:
    payload = {"name": name, "partySize": party_size}
    if phone is not None:
        payload["phone"] = phone
    response = client.post("/api/checkin", json=payload)
    assert response.status_code == 201, response.text
    return response.json()
