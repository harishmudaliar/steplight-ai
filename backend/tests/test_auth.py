from datetime import timedelta
import pytest
from backend.app.core.security import create_access_token


def test_register_success(client, db_session):
    res = client.post(
        "/api/auth/register",
        json={
            "email": "traveler1@steplight.ai",
            "password": "CompassionatePassword123",
            "display_name": "Atlas",
            "baseline_capacity": "low",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "traveler1@steplight.ai"
    assert data["user"]["display_name"] == "Atlas"
    assert data["user"]["baseline_capacity"] == "low"
    from backend.app.models.user import User
    from backend.app.core.security import verify_password
    saved = db_session.query(User).filter_by(id=data["user"]["id"]).one()
    assert saved.hashed_password.startswith("$argon2id$")
    assert verify_password("CompassionatePassword123", saved.hashed_password)
    assert "hashed_password" not in data["user"]


def test_register_duplicate_email(client):
    # First registration
    client.post(
        "/api/auth/register",
        json={
            "email": "unique@steplight.ai",
            "password": "Password12345",
        },
    )
    # Duplicate registration attempt
    res = client.post(
        "/api/auth/register",
        json={
            "email": "unique@steplight.ai",
            "password": "DifferentPassword123",
        },
    )
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()


def test_register_short_password(client):
    res = client.post(
        "/api/auth/register",
        json={
            "email": "short@steplight.ai",
            "password": "123",
        },
    )
    assert res.status_code == 422


def test_login_success(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "loginuser@steplight.ai",
            "password": "SecurePassword123",
            "display_name": "Login Tester",
        },
    )

    res = client.post(
        "/api/auth/login",
        json={
            "email": "loginuser@steplight.ai",
            "password": "SecurePassword123",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "loginuser@steplight.ai"


def test_login_invalid_password_generic_error(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "wrongpwd@steplight.ai",
            "password": "OriginalPassword123",
        },
    )

    res = client.post(
        "/api/auth/login",
        json={
            "email": "wrongpwd@steplight.ai",
            "password": "IncorrectPassword123",
        },
    )
    assert res.status_code == 401
    # Check that generic error is returned
    assert res.json()["detail"] == "Invalid email or password."


def test_login_nonexistent_user_generic_error(client):
    res = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent_traveler@steplight.ai",
            "password": "AnyPassword123",
        },
    )
    assert res.status_code == 401
    # Generic error prevents email enumeration
    assert res.json()["detail"] == "Invalid email or password."


@pytest.mark.parametrize("payload", [{"email": "missing-password@example.test"}, {"password": "missing-email"}, {}])
def test_login_rejects_missing_credentials(client, payload):
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"]


def test_get_profile_me(client):
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "profile@steplight.ai",
            "password": "Password123",
            "display_name": "Profile Person",
        },
    ).json()

    token = reg["access_token"]
    res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "profile@steplight.ai"
    assert data["display_name"] == "Profile Person"


def test_get_profile_me_unauthorized(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_refresh_token(client):
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "refresher@steplight.ai",
            "password": "Password123",
        },
    ).json()

    refresh_token = reg["refresh_token"]
    res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_logout_revokes_refresh_token(client):
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "logoutuser@steplight.ai",
            "password": "Password123",
        },
    ).json()

    refresh_token = reg["refresh_token"]

    # Logout and revoke
    logout_res = client.post(
        "/api/auth/logout",
        json={"refresh_token": refresh_token},
    )
    assert logout_res.status_code == 200

    # Refreshing with revoked token must fail
    refresh_res = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 401
    assert "revoked" in refresh_res.json()["detail"].lower()


def test_token_expiration(client):
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "expired@steplight.ai",
            "password": "Password123",
        },
    ).json()

    user_id = reg["user"]["id"]
    # Generate an expired token (expired 10 seconds ago)
    expired_token = create_access_token(
        user_id=user_id,
        email="expired@steplight.ai",
        expires_delta=timedelta(seconds=-10),
    )

    res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


@pytest.mark.parametrize("origin", ["http://localhost:5173", "http://127.0.0.1:5173", "app://steplight"])
def test_auth_cors_preflight(client, origin):
    response = client.options("/api/auth/register", headers={
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


@pytest.mark.parametrize("origin", ["http://localhost:5174", "http://127.0.0.1:5174"])
def test_auth_cors_allows_vite_fallback_port(client, origin):
    response = client.options("/api/auth/login", headers={
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_auth_cors_rejects_non_local_origins(client):
    response = client.options("/api/auth/login", headers={
        "Origin": "https://untrusted.example",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
