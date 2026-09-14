from quickqueue_backend.orm import TurnoverRecord

from .conftest import check_in


def test_wait_stats_defaults_to_eighteen_minutes_with_no_history(client):
    response = client.get("/api/wait-stats")
    assert response.status_code == 200
    body = response.json()
    assert body["rollingAverageWaitMinutes"] == 18
    assert body["lastUpdated"] is not None


def test_wait_stats_reflects_recorded_turnover_history(client, db_session):
    for minutes in (10, 20, 30):
        db_session.add(TurnoverRecord(minutes=minutes))
    db_session.commit()

    body = client.get("/api/wait-stats").json()
    assert body["rollingAverageWaitMinutes"] == 20


def test_wait_stats_rolling_window_uses_only_the_five_most_recent_entries(client, db_session):
    # The oldest two (999, 999) should be ignored once more than five exist.
    for minutes in (999, 999, 10, 20, 30, 40, 50):
        db_session.add(TurnoverRecord(minutes=minutes))
    db_session.commit()

    body = client.get("/api/wait-stats").json()
    assert body["rollingAverageWaitMinutes"] == 30  # average of 10, 20, 30, 40, 50


def test_free_table_appends_a_new_turnover_entry(client, db_session):
    party = check_in(client, name="Alvarez")["party"]
    client.post(f"/api/parties/{party['id']}/seat")
    client.post(f"/api/parties/{party['id']}/free")

    count = db_session.query(TurnoverRecord).count()
    assert count == 1
