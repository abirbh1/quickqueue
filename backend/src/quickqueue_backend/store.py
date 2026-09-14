"""Business logic for the waiting-list queue, backed by a real database.

Database-agnostic: only the SQLAlchemy ORM query API is used here (no raw
SQL, no dialect-specific functions), so swapping SQLite for PostgreSQL,
MySQL, etc. is purely a matter of changing DATABASE_URL (see db.py).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .orm import PartyRecord, TurnoverRecord, new_id, utcnow

PartyStatus = Literal["waiting", "seated", "cancelled", "no_show"]
ReportRange = Literal["today", "week"]

TURNOVER_HISTORY_SIZE = 5
DEFAULT_TURNOVER_MINUTES = 18.0


class PartyNotFoundError(Exception):
    def __init__(self, party_id: str) -> None:
        self.party_id = party_id
        super().__init__(f"Party {party_id} not found")


class PartyNotSeatedError(Exception):
    def __init__(self, party_id: str) -> None:
        self.party_id = party_id
        super().__init__(f"Party {party_id} has not been seated yet")


def _format_hour_window(hour: int) -> str:
    def label(h: int) -> str:
        period = "AM" if h < 12 else "PM"
        display = 12 if h % 12 == 0 else h % 12
        return f"{display} {period}"

    return f"{label(hour)}–{label((hour + 1) % 24)}"


class Store:
    """Queue business logic bound to a single SQLAlchemy session (one per request)."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def _find(self, party_id: str) -> PartyRecord:
        party = self.session.get(PartyRecord, party_id)
        if party is None:
            raise PartyNotFoundError(party_id)
        return party

    def average_turnover_minutes(self) -> float:
        recent = self.session.scalars(
            select(TurnoverRecord.minutes).order_by(TurnoverRecord.id.desc()).limit(TURNOVER_HISTORY_SIZE)
        ).all()
        if not recent:
            return DEFAULT_TURNOVER_MINUTES
        return sum(recent) / len(recent)

    def get_queue(self) -> list[PartyRecord]:
        return list(
            self.session.scalars(
                select(PartyRecord).where(PartyRecord.status == "waiting").order_by(PartyRecord.queue_position)
            )
        )

    def get_seated(self) -> list[PartyRecord]:
        return list(
            self.session.scalars(
                select(PartyRecord)
                .where(PartyRecord.status == "seated", PartyRecord.table_freed_time.is_(None))
                .order_by(PartyRecord.seated_time)
            )
        )

    def get_wait_stats(self) -> tuple[float, datetime]:
        return self.average_turnover_minutes(), utcnow()

    def check_in(self, name: str, phone: str | None, party_size: int) -> tuple[PartyRecord, int, int]:
        next_position = (self.session.scalar(select(func.max(PartyRecord.queue_position))) or 0) + 1
        party = PartyRecord(
            id=new_id(),
            name=name.strip(),
            phone=(phone.strip() or None) if phone else None,
            party_size=party_size,
            check_in_time=utcnow(),
            status="waiting",
            queue_position=next_position,
        )
        self.session.add(party)
        self.session.commit()
        self.session.refresh(party)

        waiting = self.get_queue()
        position = next(i for i, p in enumerate(waiting) if p.id == party.id) + 1
        estimated_wait_minutes = round(self.average_turnover_minutes() * position)
        return party, position, estimated_wait_minutes

    def seat_party(self, party_id: str) -> PartyRecord:
        party = self._find(party_id)
        party.status = "seated"
        party.seated_time = utcnow()
        self.session.commit()
        self.session.refresh(party)
        return party

    def free_table(self, party_id: str) -> PartyRecord:
        party = self._find(party_id)
        if party.seated_time is None:
            raise PartyNotSeatedError(party_id)
        party.table_freed_time = utcnow()

        turnover_minutes = max(1, round((party.table_freed_time - party.seated_time).total_seconds() / 60))
        self.session.add(TurnoverRecord(minutes=turnover_minutes))
        self.session.commit()
        self.session.refresh(party)
        return party

    def cancel_party(self, party_id: str) -> PartyRecord:
        party = self._find(party_id)
        party.status = "cancelled"
        self.session.commit()
        self.session.refresh(party)
        return party

    def mark_no_show(self, party_id: str) -> PartyRecord:
        party = self._find(party_id)
        party.status = "no_show"
        self.session.commit()
        self.session.refresh(party)
        return party

    def _swap_waiting(self, party_id: str, direction: Literal["up", "down"]) -> None:
        waiting = self.get_queue()
        pos = next((i for i, p in enumerate(waiting) if p.id == party_id), None)
        if pos is None:
            raise PartyNotFoundError(party_id)

        swap_with = pos - 1 if direction == "up" else pos + 1
        if swap_with < 0 or swap_with >= len(waiting):
            return

        a, b = waiting[pos], waiting[swap_with]
        a.queue_position, b.queue_position = b.queue_position, a.queue_position
        self.session.commit()

    def move_up(self, party_id: str) -> None:
        self._swap_waiting(party_id, "up")

    def move_down(self, party_id: str) -> None:
        self._swap_waiting(party_id, "down")

    def _range_start(self, range_: ReportRange) -> datetime:
        now = utcnow()
        if range_ == "today":
            return now.replace(hour=0, minute=0, second=0, microsecond=0)
        return now - timedelta(days=7)

    def get_report(self, range_: ReportRange) -> dict:
        start = self._range_start(range_)
        in_range = list(self.session.scalars(select(PartyRecord).where(PartyRecord.check_in_time >= start)))

        wait_samples = [
            (p.seated_time - p.check_in_time).total_seconds() / 60
            for p in in_range
            if p.seated_time is not None
        ]
        average_wait_minutes = sum(wait_samples) / len(wait_samples) if wait_samples else 0.0

        total_parties_served = sum(1 for p in in_range if p.table_freed_time is not None)

        hour_counts: dict[int, int] = {}
        for p in in_range:
            hour = p.check_in_time.hour
            hour_counts[hour] = hour_counts.get(hour, 0) + 1
        peak_windows = [
            {"hour_label": _format_hour_window(hour), "count": count}
            for hour, count in sorted(hour_counts.items())
        ]

        return {
            "range": range_,
            "average_wait_minutes": average_wait_minutes,
            "total_parties_served": total_parties_served,
            "peak_windows": peak_windows,
        }
