from unittest.mock import patch

from fastapi.testclient import TestClient

from src.deps import CurrentUser, current_user
from src.main import app

client = TestClient(app)


def _fake_user() -> CurrentUser:
    return CurrentUser(id="00000000-0000-0000-0000-000000000001")


def test_post_requires_membership():
    app.dependency_overrides[current_user] = _fake_user
    try:
        with patch("src.routers.health_report.get_service_client", return_value=object()), patch(
            "src.routers.health_report.is_member", return_value=False
        ):
            r = client.post("/health-analysis/ws-1", json={"workspace_id": "ws-1", "mes": "2026-06"})
        assert r.status_code == 403
    finally:
        app.dependency_overrides.clear()
