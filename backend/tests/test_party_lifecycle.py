from .conftest import check_in


def test_seat_party_marks_status_and_sets_seated_time(client):
    party = check_in(client, name="Alvarez")["party"]

    response = client.post(f"/api/parties/{party['id']}/seat")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "seated"
    assert body["seatedTime"] is not None


def test_seat_unknown_party_returns_404(client):
    response = client.post("/api/parties/does-not-exist/seat")
    assert response.status_code == 404


def test_free_table_marks_status_and_sets_table_freed_time(client):
    party = check_in(client, name="Alvarez")["party"]
    client.post(f"/api/parties/{party['id']}/seat")

    response = client.post(f"/api/parties/{party['id']}/free")
    assert response.status_code == 200
    body = response.json()
    assert body["tableFreedTime"] is not None


def test_free_table_before_seating_returns_409(client):
    party = check_in(client, name="Alvarez")["party"]

    response = client.post(f"/api/parties/{party['id']}/free")
    assert response.status_code == 409


def test_free_unknown_party_returns_404(client):
    response = client.post("/api/parties/does-not-exist/free")
    assert response.status_code == 404


def test_free_table_updates_rolling_wait_stats(client):
    party = check_in(client, name="Alvarez")["party"]
    client.post(f"/api/parties/{party['id']}/seat")
    client.post(f"/api/parties/{party['id']}/free")

    stats = client.get("/api/wait-stats").json()
    # A single, near-instant turnover in a fresh store becomes the new rolling average.
    assert stats["rollingAverageWaitMinutes"] < 18


def test_cancel_party_marks_status(client):
    party = check_in(client, name="Alvarez")["party"]

    response = client.post(f"/api/parties/{party['id']}/cancel")
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"

    queue_names = [p["name"] for p in client.get("/api/queue").json()]
    assert queue_names == []


def test_cancel_unknown_party_returns_404(client):
    response = client.post("/api/parties/does-not-exist/cancel")
    assert response.status_code == 404


def test_no_show_marks_status(client):
    party = check_in(client, name="Alvarez")["party"]

    response = client.post(f"/api/parties/{party['id']}/no-show")
    assert response.status_code == 200
    assert response.json()["status"] == "no_show"


def test_no_show_unknown_party_returns_404(client):
    response = client.post("/api/parties/does-not-exist/no-show")
    assert response.status_code == 404
