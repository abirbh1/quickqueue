"""Demo seed data, applied once to an empty database.

Mirrors the seed data the frontend's original mock backend shipped with
(frontend/src/api/client.ts) so a freshly cloned repo still demos well.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .orm import PartyRecord, TurnoverRecord


def _minutes_ago(n: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=n)


def seed_if_empty(session: Session) -> None:
    if session.scalar(select(PartyRecord.id).limit(1)) is not None:
        return

    parties = [
        # Currently waiting
        PartyRecord(name="Alvarez", party_size=4, check_in_time=_minutes_ago(18), queue_position=1),
        PartyRecord(name="Chen", party_size=2, check_in_time=_minutes_ago(9), queue_position=2),
        PartyRecord(name="Okafor", party_size=6, check_in_time=_minutes_ago(3), queue_position=3, phone="555-0142"),
        # Currently seated
        PartyRecord(name="Diallo", party_size=3, check_in_time=_minutes_ago(24), queue_position=4,
                    status="seated", seated_time=_minutes_ago(6)),
        # Completed today
        PartyRecord(name="Nguyen", party_size=2, check_in_time=_minutes_ago(150), queue_position=5,
                    status="seated", seated_time=_minutes_ago(135), table_freed_time=_minutes_ago(100)),
        PartyRecord(name="Park", party_size=5, check_in_time=_minutes_ago(140), queue_position=6,
                    status="seated", seated_time=_minutes_ago(128), table_freed_time=_minutes_ago(95)),
        PartyRecord(name="Silva", party_size=2, check_in_time=_minutes_ago(130), queue_position=7,
                    status="seated", seated_time=_minutes_ago(120), table_freed_time=_minutes_ago(88)),
        PartyRecord(name="Haddad", party_size=4, check_in_time=_minutes_ago(125), queue_position=8,
                    status="seated", seated_time=_minutes_ago(110), table_freed_time=_minutes_ago(78)),
        PartyRecord(name="Kowalski", party_size=3, check_in_time=_minutes_ago(90), queue_position=9,
                    status="seated", seated_time=_minutes_ago(80), table_freed_time=_minutes_ago(45)),
        PartyRecord(name="Tremblay", party_size=2, check_in_time=_minutes_ago(85), queue_position=10,
                    status="no_show"),
        PartyRecord(name="Ibrahim", party_size=4, check_in_time=_minutes_ago(70), queue_position=11,
                    status="seated", seated_time=_minutes_ago(60), table_freed_time=_minutes_ago(28)),
        PartyRecord(name="Roy", party_size=2, check_in_time=_minutes_ago(55), queue_position=12,
                    status="cancelled"),
        # Completed earlier this week
        PartyRecord(name="Martin", party_size=2, check_in_time=_minutes_ago(60 * 26), queue_position=13,
                    status="seated", seated_time=_minutes_ago(60 * 26 - 14), table_freed_time=_minutes_ago(60 * 26 - 45)),
        PartyRecord(name="Fournier", party_size=6, check_in_time=_minutes_ago(60 * 27), queue_position=14,
                    status="seated", seated_time=_minutes_ago(60 * 27 - 20), table_freed_time=_minutes_ago(60 * 27 - 62)),
        PartyRecord(name="Bouchard", party_size=3, check_in_time=_minutes_ago(60 * 50), queue_position=15,
                    status="seated", seated_time=_minutes_ago(60 * 50 - 10), table_freed_time=_minutes_ago(60 * 50 - 38)),
        PartyRecord(name="Gagnon", party_size=4, check_in_time=_minutes_ago(60 * 51), queue_position=16,
                    status="seated", seated_time=_minutes_ago(60 * 51 - 16), table_freed_time=_minutes_ago(60 * 51 - 50)),
    ]
    session.add_all(parties)
    session.add_all(TurnoverRecord(minutes=m) for m in (34, 41, 29, 37, 30))
    session.commit()
