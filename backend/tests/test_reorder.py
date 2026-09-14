from .conftest import check_in


def _queue_names(client) -> list[str]:
    return [p["name"] for p in client.get("/api/queue").json()]


def test_move_up_swaps_with_previous_party(client):
    check_in(client, name="Alvarez")
    chen = check_in(client, name="Chen")["party"]
    check_in(client, name="Okafor")

    response = client.post(f"/api/parties/{chen['id']}/move-up")
    assert response.status_code == 204
    assert _queue_names(client) == ["Chen", "Alvarez", "Okafor"]


def test_move_down_swaps_with_next_party(client):
    alvarez = check_in(client, name="Alvarez")["party"]
    check_in(client, name="Chen")
    check_in(client, name="Okafor")

    client.post(f"/api/parties/{alvarez['id']}/move-down")
    assert _queue_names(client) == ["Chen", "Alvarez", "Okafor"]


def test_move_up_first_party_is_a_noop(client):
    alvarez = check_in(client, name="Alvarez")["party"]
    check_in(client, name="Chen")

    response = client.post(f"/api/parties/{alvarez['id']}/move-up")
    assert response.status_code == 204
    assert _queue_names(client) == ["Alvarez", "Chen"]


def test_move_down_last_party_is_a_noop(client):
    check_in(client, name="Alvarez")
    chen = check_in(client, name="Chen")["party"]

    response = client.post(f"/api/parties/{chen['id']}/move-down")
    assert response.status_code == 204
    assert _queue_names(client) == ["Alvarez", "Chen"]


def test_move_up_unknown_party_returns_404(client):
    response = client.post("/api/parties/does-not-exist/move-up")
    assert response.status_code == 404


def test_move_down_unknown_party_returns_404(client):
    response = client.post("/api/parties/does-not-exist/move-down")
    assert response.status_code == 404
