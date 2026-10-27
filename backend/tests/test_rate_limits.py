import pytest
from backend.app.core.rate_limit import auth_limiter


def test_auth_rate_limiting(client):
    auth_limiter.clear()

    # Hit login endpoint with bad credentials repeatedly
    exceeded = False
    status_codes = []
    for _ in range(25):
        res = client.post(
            "/api/auth/login",
            json={"email": "ratelimit_target@steplight.ai", "password": "wrongpassword"},
        )
        status_codes.append(res.status_code)
        if res.status_code == 429:
            exceeded = True
            assert "gentle breath" in res.json()["detail"].lower()
            break

    assert exceeded is True, f"Expected 429 Too Many Requests, got codes: {status_codes}"
