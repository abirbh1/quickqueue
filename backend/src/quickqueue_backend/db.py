"""Database engine/session wiring.

Only the SQLAlchemy ORM query API is used anywhere in this app (see
store.py), so the concrete database is swappable via the DATABASE_URL
environment variable — SQLite by default, but PostgreSQL/MySQL/etc. work
without touching application code, just `pip install` the right driver and
point DATABASE_URL at it.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.types import DateTime, TypeDecorator

DEFAULT_DATABASE_URL = "sqlite:///./quickqueue.db"


class Base(DeclarativeBase):
    pass


class UTCDateTime(TypeDecorator):
    """A timezone-aware UTC datetime that round-trips consistently across backends.

    SQLite has no native timezone-aware storage: SQLAlchemy silently stores
    naive text and hands back a naive datetime on read, even through a
    DateTime(timezone=True) column. Backends like PostgreSQL don't have that
    problem. Normalizing at this layer means the rest of the app can always
    assume `datetime.now(timezone.utc)`-style aware datetimes, regardless of
    which database is configured.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


def make_engine(database_url: str | None = None):
    url = database_url or os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)
    kwargs: dict = {}
    if url.startswith("sqlite"):
        # Required for SQLite to allow the connection to be used across the
        # threadpool FastAPI runs sync dependencies in.
        kwargs["connect_args"] = {"check_same_thread": False}
        if ":memory:" in url:
            # An in-memory SQLite database is per-connection; StaticPool
            # keeps a single connection alive so all sessions see the same
            # data (used for tests and ephemeral runs).
            kwargs["poolclass"] = StaticPool
    return create_engine(url, **kwargs)


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_db(bind=None) -> None:
    Base.metadata.create_all(bind=bind or engine)


def get_session() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
