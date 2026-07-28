from api.index import app
from api.routes import webhook as webhook_route


def _client():
    return app.test_client()


def test_missing_body_is_400():
    res = _client().post("/api/v1/complete", json={})
    assert res.status_code == 400


def test_short_token_is_rejected():
    res = _client().post("/api/v1/complete", json={"token": "tooshort", "habit_id": "read"})
    assert res.status_code == 400


def test_unknown_token_is_401(monkeypatch):
    monkeypatch.setattr(webhook_route.webhook_service, "complete_via_token", lambda *a, **k: None)
    res = _client().post("/api/v1/complete", json={"token": "x" * 20, "habit_id": "read"})
    assert res.status_code == 401


def test_valid_completion_is_200(monkeypatch):
    seen = {}

    def fake(token, habit_id, source="webhook"):
        seen.update(token=token, habit_id=habit_id, source=source)
        return "uid_123"

    monkeypatch.setattr(webhook_route.webhook_service, "complete_via_token", fake)
    res = _client().post("/api/v1/complete", json={"token": "y" * 20, "habit_id": "workout"})
    assert res.status_code == 200
    assert res.get_json()["habit"] == "workout"
    assert seen == {"token": "y" * 20, "habit_id": "workout", "source": "webhook"}
