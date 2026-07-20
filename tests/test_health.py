from api.index import app


def test_health_returns_ok():
    client = app.test_client()
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_unknown_route_is_404():
    res = app.test_client().get("/api/nope")
    assert res.status_code == 404
