from .conftest import check_in


def test_queue_is_empty_initially(client):
    response = client.get("/api/queue")
    assert response.status_code == 200
    assert response.json() == []


def test_seated_is_empty_initially(client):
    response = client.get("/api/seated")
    assert response.status_code == 200
    assert response.json() == []


def test_queue_lists_only_waiting_parties_in_arrival_order(client):
    check_in(client, name="Alvarez")
    check_in(client, name="Chen")
    check_in(client, name="Okafor")

    response = client.get("/api/queue")
    names = [p["name"] for p in response.json()]
    assert names == ["Alvarez", "Chen", "Okafor"]


def test_seated_lists_parties_whose_table_is_not_yet_freed(client):
    alvarez = check_in(client, name="Alvarez")["party"]
    check_in(client, name="Chen")

    client.post(f"/api/parties/{alvarez['id']}/seat")

    response = client.get("/api/seated")
    names = [p["name"] for p in response.json()]
    assert names == ["Alvarez"]

    # Seated parties should no longer appear in the waiting queue.
    queue_names = [p["name"] for p in client.get("/api/queue").json()]
    assert queue_names == ["Chen"]


def test_seated_excludes_parties_whose_table_was_freed(client):
    alvarez = check_in(client, name="Alvarez")["party"]
    client.post(f"/api/parties/{alvarez['id']}/seat")
    client.post(f"/api/parties/{alvarez['id']}/free")

    response = client.get("/api/seated")
    assert response.json() == []
