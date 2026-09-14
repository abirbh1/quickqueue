from .conftest import check_in


def test_checkin_returns_party_position_and_estimate(client):
    result = check_in(client, name="Alvarez", party_size=4)

    assert result["party"]["name"] == "Alvarez"
    assert result["party"]["partySize"] == 4
    assert result["party"]["status"] == "waiting"
    assert result["party"]["seatedTime"] is None
    assert result["party"]["tableFreedTime"] is None
    assert result["position"] == 1
    # No turnover history yet -> falls back to the 18-minute default.
    assert result["estimatedWaitMinutes"] == 18


def test_checkin_position_increments_with_queue_length(client):
    check_in(client, name="Alvarez")
    check_in(client, name="Chen")
    third = check_in(client, name="Okafor")

    assert third["position"] == 3
    assert third["estimatedWaitMinutes"] == 18 * 3


def test_checkin_stores_optional_phone(client):
    result = check_in(client, name="Okafor", phone="555-0142")
    assert result["party"]["phone"] == "555-0142"


def test_checkin_omits_phone_when_not_given(client):
    result = check_in(client, name="Chen")
    assert result["party"]["phone"] is None


def test_checkin_appears_in_queue(client):
    check_in(client, name="Alvarez")
    response = client.get("/api/queue")
    assert response.status_code == 200
    names = [p["name"] for p in response.json()]
    assert names == ["Alvarez"]


def test_checkin_rejects_missing_name(client):
    response = client.post("/api/checkin", json={"partySize": 2})
    assert response.status_code == 422


def test_checkin_rejects_blank_name(client):
    response = client.post("/api/checkin", json={"name": "   ", "partySize": 2})
    assert response.status_code == 422


def test_checkin_rejects_non_positive_party_size(client):
    response = client.post("/api/checkin", json={"name": "Roy", "partySize": 0})
    assert response.status_code == 422
