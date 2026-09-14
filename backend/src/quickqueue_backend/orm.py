from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base, UTCDateTime


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PartyRecord(Base):
    __tablename__ = "parties"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    party_size: Mapped[int] = mapped_column(Integer, nullable=False)
    check_in_time: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="waiting")
    # Determines queue order independently of check_in_time, so parties can be
    # manually reordered (move up/down) without touching arrival timestamps.
    # Only meaningful while status == "waiting".
    queue_position: Mapped[int] = mapped_column(Integer, nullable=False)
    seated_time: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    table_freed_time: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)


class TurnoverRecord(Base):
    """An append-only log of completed table turnovers.

    The rolling average only ever looks at the most recent N rows (see
    Store.average_turnover_minutes), so older rows are simply ignored rather
    than deleted — a real database makes it cheap to keep the full history
    around for future reporting instead of discarding it.
    """

    __tablename__ = "turnovers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False, default=utcnow)
