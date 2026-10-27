from backend.app.core.email_sink import get_latest_reset_token
from backend.app.core import email_sink


def test_password_reset_token_is_not_copied_to_application_logs(tmp_path, caplog, monkeypatch):
    monkeypatch.setattr(email_sink.settings, "DEV_EMAIL_SINK_FILE", tmp_path / "dev-email.log")
    token = "single-use-reset-token-test-value"
    email_sink.record_password_reset_email("private@example.test", token)
    assert token not in caplog.text
    assert email_sink.get_latest_reset_token("private@example.test") == token


def test_password_reset_flow(client):
    email = "reset_traveler@steplight.ai"
    client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "InitialPassword123",
            "display_name": "Reset Tester",
        },
    )

    # 1. Request password reset
    forgot_res = client.post(
        "/api/auth/forgot-password",
        json={"email": email},
    )
    assert forgot_res.status_code == 200
    assert "reset instructions have been generated" in forgot_res.json()["message"]

    # 2. Retrieve token from development email sink
    reset_token = get_latest_reset_token(email)
    assert reset_token is not None
    assert len(reset_token) >= 32

    # 3. Perform password reset with token
    reset_res = client.post(
        "/api/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": "BrandNewPassword123",
        },
    )
    assert reset_res.status_code == 200
    assert "successfully updated" in reset_res.json()["message"]

    # 4. Login with old password must fail
    old_login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "InitialPassword123"},
    )
    assert old_login.status_code == 401

    # 5. Login with new password must succeed
    new_login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "BrandNewPassword123"},
    )
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()


def test_password_reset_token_single_use(client):
    email = "single_use@steplight.ai"
    client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "Password123",
        },
    )

    client.post("/api/auth/forgot-password", json={"email": email})
    reset_token = get_latest_reset_token(email)

    # First reset succeeds
    first_res = client.post(
        "/api/auth/reset-password",
        json={"token": reset_token, "new_password": "NewPassword123"},
    )
    assert first_res.status_code == 200

    # Second reset with SAME token must fail (single-use token enforcement)
    second_res = client.post(
        "/api/auth/reset-password",
        json={"token": reset_token, "new_password": "AnotherPassword123"},
    )
    assert second_res.status_code == 400
    assert "already been used" in second_res.json()["detail"].lower() or "invalid" in second_res.json()["detail"].lower()


def test_password_reset_invalid_token(client):
    res = client.post(
        "/api/auth/reset-password",
        json={"token": "totally_fabricated_token_value", "new_password": "NewPassword123"},
    )
    assert res.status_code == 400
    assert "invalid" in res.json()["detail"].lower()


def test_forgot_password_nonexistent_email_does_not_leak(client):
    res = client.post(
        "/api/auth/forgot-password",
        json={"email": "nobody_exists_here@steplight.ai"},
    )
    assert res.status_code == 200
    assert "instructions have been generated" in res.json()["message"]
    # Verify no token was generated in dev sink for non-existent user
    assert get_latest_reset_token("nobody_exists_here@steplight.ai") is None
