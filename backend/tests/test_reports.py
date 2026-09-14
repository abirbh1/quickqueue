from datetime import datetime, timedelta, timezone

import pytest

from quickqueue_backend.orm import PartyRecord


def _minutes_ago(n: float) -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=n)


def _add_party(db_session, **overrides) -> None:
    defaults = dict(status="waiting", queue_position=0, phone=None, seated_time=None, table_freed_time=None)
    defaults.update(overrides)
    db_session.add(PartyRecord(**defaults))
    db_session.commit()


def test_report_defaults_to_today_range(client):
    response = client.get("/api/reports")
    assert response.status_code == 200
    assert response.json()["range"] == "today"


def test_report_today_excludes_parties_outside_the_current_day(client, db_session):
    _add_party(db_session, id="1", name="Nguyen", party_size=2, check_in_time=_minutes_ago(1),
               status="seated", seated_time=_minutes_ago(0.5))
    # More than a full day ago: always before today's midnight, regardless of when the test runs.
    _add_party(db_session, id="2", name="Martin", party_size=2, check_in_time=_minutes_ago(60 * 26),
               status="seated", seated_time=_minutes_ago(60 * 26 - 14))

    today = client.get("/api/reports", params={"range": "today"}).json()
    assert today["totalPartiesServed"] == 0  # neither table has been freed
    assert sum(w["count"] for w in today["peakWindows"]) == 1


def test_report_week_includes_the_last_seven_days(client, db_session):
    _add_party(db_session, id="1", name="Nguyen", party_size=2, check_in_time=_minutes_ago(1))
    _add_party(db_session, id="2", name="Martin", party_size=2, check_in_time=_minutes_ago(60 * 26))
    # More than seven days ago: excluded even from the week range.
    _add_party(db_session, id="3", name="Fournier", party_size=6, check_in_time=_minutes_ago(60 * 24 * 10))

    week = client.get("/api/reports", params={"range": "week"}).json()
    assert sum(w["count"] for w in week["peakWindows"]) == 2


def test_report_average_wait_minutes_only_counts_seated_parties(client, db_session):
    _add_party(db_session, id="1", name="Chen", party_size=2, check_in_time=_minutes_ago(20),
               status="seated", seated_time=_minutes_ago(10))
    _add_party(db_session, id="2", name="Roy", party_size=2, check_in_time=_minutes_ago(15),
               status="cancelled")

    report = client.get("/api/reports", params={"range": "today"}).json()
    assert report["averageWaitMinutes"] == pytest.approx(10, abs=1)


def test_report_total_parties_served_counts_freed_tables_only(client, db_session):
    _add_party(db_session, id="1", name="Diallo", party_size=3, check_in_time=_minutes_ago(40),
               status="seated", seated_time=_minutes_ago(30), table_freed_time=_minutes_ago(5))
    _add_party(db_session, id="2", name="Chen", party_size=2, check_in_time=_minutes_ago(10),
               status="seated", seated_time=_minutes_ago(5))

    report = client.get("/api/reports", params={"range": "today"}).json()
    assert report["totalPartiesServed"] == 1


def test_report_peak_windows_sum_matches_party_count_in_range(client, db_session):
    for i in range(5):
        _add_party(db_session, id=str(i), name=f"Party {i}", party_size=2, check_in_time=_minutes_ago(i))

    report = client.get("/api/reports", params={"range": "today"}).json()
    assert sum(w["count"] for w in report["peakWindows"]) == 5
