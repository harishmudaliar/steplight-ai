import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Steplight AI" in data["message"]
    assert data["tagline"] == "One Tiny Step. Zero Shame."
    assert data["health"] == "/api/health"
    assert data["version"] == "/api/version"


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "Steplight AI"
    assert data["version"] == "1.0.0"
    assert data["environment"] == "development"


def test_version_endpoint():
    response = client.get("/api/version")
    assert response.status_code == 200
    data = response.json()
    assert data["version"] == "1.0.0"
    assert data["app_name"] == "Steplight AI"
    assert data["tagline"] == "One Tiny Step. Zero Shame."


def test_cors_preflight():
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
