import pytest


def test_per_user_authorization_isolation(client):
    # 1. Register User A
    user_a = client.post(
        "/api/auth/register",
        json={
            "email": "user_a@steplight.ai",
            "password": "PasswordUserA123",
            "display_name": "Traveler A",
        },
    ).json()
    token_a = user_a["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register User B
    user_b = client.post(
        "/api/auth/register",
        json={
            "email": "user_b@steplight.ai",
            "password": "PasswordUserB123",
            "display_name": "Traveler B",
        },
    ).json()
    token_b = user_b["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User A creates a private task with a micro-step
    task_a = client.post(
        "/api/tasks",
        headers=headers_a,
        json={
            "title": "User A Private Sanctuary Task",
            "capacity": "medium",
            "steps": [
                {
                    "title": "User A Secret Micro Step",
                    "estimated_duration": 60,
                }
            ],
        },
    ).json()
    task_a_id = task_a["id"]
    step_a_id = task_a["steps"][0]["id"]

    # 4. User B creates their own task
    task_b = client.post(
        "/api/tasks",
        headers=headers_b,
        json={
            "title": "User B Separate Task",
            "capacity": "low",
        },
    ).json()
    task_b_id = task_b["id"]

    # 5. User B lists tasks - MUST ONLY see Task B, NEVER Task A
    # GET /api/tasks now returns paginated: {tasks: [...], total: ..., page: ..., pages: ...}
    list_b_resp = client.get("/api/tasks", headers=headers_b).json()
    task_ids_b = [t["id"] for t in list_b_resp["tasks"]]
    assert task_b_id in task_ids_b
    assert task_a_id not in task_ids_b

    # 6. User B attempts to read User A's task -> 404 NOT FOUND
    get_res = client.get(f"/api/tasks/{task_a_id}", headers=headers_b)
    assert get_res.status_code == 404

    # 7. User B attempts to edit User A's task -> 404 NOT FOUND
    patch_res = client.patch(
        f"/api/tasks/{task_a_id}",
        headers=headers_b,
        json={"title": "Hacked Title"},
    )
    assert patch_res.status_code == 404

    # 8. User B attempts to delete User A's task -> 404 NOT FOUND
    del_res = client.delete(f"/api/tasks/{task_a_id}", headers=headers_b)
    assert del_res.status_code == 404

    # 9. User B attempts to add a step to User A's task -> 404 NOT FOUND
    add_step_res = client.post(
        f"/api/tasks/{task_a_id}/steps",
        headers=headers_b,
        json={"title": "Unauthorized Step"},
    )
    assert add_step_res.status_code == 404

    # 10. User B attempts to update User A's step -> 404 NOT FOUND
    update_step_res = client.patch(
        f"/api/tasks/{task_a_id}/steps/{step_a_id}",
        headers=headers_b,
        json={"status": "completed"},
    )
    assert update_step_res.status_code == 404

    # 11. Verify User A's task and step remain untouched
    task_a_verified = client.get(f"/api/tasks/{task_a_id}", headers=headers_a).json()
    assert task_a_verified["title"] == "User A Private Sanctuary Task"
    assert task_a_verified["steps"][0]["status"] == "pending"


def test_per_user_preferences_isolation(client):
    user_a = client.post(
        "/api/auth/register",
        json={"email": "pref_a@steplight.ai", "password": "Password123"},
    ).json()
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}

    user_b = client.post(
        "/api/auth/register",
        json={"email": "pref_b@steplight.ai", "password": "Password123"},
    ).json()
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

    # User A sets theme to dark
    client.put(
        "/api/preferences",
        headers=headers_a,
        json={"theme": "dark", "default_duration": 25},
    )

    # User B sets theme to light
    client.put(
        "/api/preferences",
        headers=headers_b,
        json={"theme": "light", "default_duration": 10},
    )

    # Verify User A's preference is still dark
    pref_a = client.get("/api/preferences", headers=headers_a).json()
    assert pref_a["theme"] == "dark"
    assert pref_a["default_duration"] == 25
    assert pref_a["gemini_personalization_enabled"] is False
    client.put(
        "/api/preferences",
        headers=headers_a,
        json={"gemini_personalization_enabled": True},
    )
    assert client.get("/api/preferences", headers=headers_a).json()[
        "gemini_personalization_enabled"
    ] is True

    # Verify User B's preference is still light
    pref_b = client.get("/api/preferences", headers=headers_b).json()
    assert pref_b["theme"] == "light"
    assert pref_b["default_duration"] == 10
    assert pref_b["gemini_personalization_enabled"] is False
