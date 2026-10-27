from sqlalchemy import select

from backend.app.models.activity import ActivityEvent
from backend.app.models.task import Step, Task


def register(client, email):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "CrossPlatformSyncPassword123"},
    )
    assert response.status_code == 201
    access_token = response.json()["access_token"]
    return {"Authorization": "Bearer " + access_token}


def test_web_desktop_resume_done_and_refresh_shared_state(client, db_session):
    web_headers = register(client, "web-desktop-sync@example.test")
    desktop_login = client.post(
        "/api/auth/login",
        json={"email": "web-desktop-sync@example.test", "password": "CrossPlatformSyncPassword123"},
    )
    desktop_headers = {"Authorization": "Bearer " + desktop_login.json()["access_token"]}
    created = client.post(
        "/api/tasks",
        headers=web_headers,
        json={"title": "Pack one small box", "steps": [{"title": "Find one box"}]},
    )
    assert created.status_code == 201
    task = created.json()
    assert task["version"] == 1
    step = task["steps"][0]
    assert step["version"] == 1

    resumed = client.get(f"/api/tasks/{task['id']}", headers=desktop_headers)
    assert resumed.status_code == 200
    assert resumed.json()["steps"][0]["title"] == "Find one box"

    completed = client.post(
        f"/api/tasks/{task['id']}/feedback",
        headers={**desktop_headers, "Idempotency-Key": "desktop-done-key-001"},
        json={"action": "done", "step_id": step["id"]},
    )
    assert completed.status_code == 200

    refreshed = client.get(f"/api/tasks/{task['id']}", headers=web_headers)
    assert refreshed.status_code == 200
    assert refreshed.json()["steps"][0]["status"] == "completed"
    assert refreshed.json()["steps"][0]["version"] == 2
    assert db_session.scalar(
        select(ActivityEvent).where(
            ActivityEvent.user_id == task["user_id"],
            ActivityEvent.event_type == "step_completed",
        )
    )


def test_stale_task_edit_returns_conflict_without_overwriting_newer_version(client):
    headers = register(client, "sync-conflict@example.test")
    task = client.post("/api/tasks", headers=headers, json={"title": "Initial title"}).json()
    first_client_snapshot = client.get(f"/api/tasks/{task['id']}", headers=headers).json()
    second_client_snapshot = client.get(f"/api/tasks/{task['id']}", headers=headers).json()

    accepted = client.patch(
        f"/api/tasks/{task['id']}",
        headers={**headers, "If-Match": str(first_client_snapshot["version"])},
        json={"title": "Updated on web"},
    )
    assert accepted.status_code == 200
    assert accepted.json()["version"] == 2

    stale = client.patch(
        f"/api/tasks/{task['id']}",
        headers={**headers, "If-Match": str(second_client_snapshot["version"])},
        json={"title": "Stale desktop edit"},
    )
    assert stale.status_code == 409
    assert "changed on another device" in stale.json()["detail"]
    latest = client.get(f"/api/tasks/{task['id']}", headers=headers).json()
    assert latest["title"] == "Updated on web"
    assert latest["version"] == 2


def test_rest_resume_and_capacity_update_advance_task_versions(client):
    headers = register(client, "rest-version@example.test")
    task = client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "Sort a drawer", "capacity": "low", "steps": [{"title": "Open one drawer"}]},
    ).json()
    rested = client.post(
        f"/api/tasks/{task['id']}/feedback",
        headers={**headers, "Idempotency-Key": "rest-version-key-001"},
        json={"action": "rest", "step_id": task["steps"][0]["id"]},
    )
    assert rested.status_code == 200
    assert rested.json()["task_version"] == 2
    assert rested.json()["task_status"] == "paused"

    stale_resume = client.patch(
        f"/api/tasks/{task['id']}",
        headers={**headers, "If-Match": str(task["version"])},
        json={"status": "active"},
    )
    assert stale_resume.status_code == 409

    resumed = client.patch(
        f"/api/tasks/{task['id']}",
        headers={**headers, "If-Match": "2"},
        json={"status": "active", "capacity": "medium"},
    )
    assert resumed.status_code == 200
    assert resumed.json()["version"] == 3
    assert resumed.json()["capacity"] == "medium"


def test_stale_step_edit_and_ownership_are_rejected(client, db_session):
    owner_headers = register(client, "step-owner@example.test")
    other_headers = register(client, "step-other@example.test")
    task = client.post(
        "/api/tasks",
        headers=owner_headers,
        json={"title": "Read a page", "steps": [{"title": "Open the book"}]},
    ).json()
    step = task["steps"][0]
    initial_version = step["version"]

    changed = client.patch(
        f"/api/tasks/{task['id']}/steps/{step['id']}",
        headers={**owner_headers, "If-Match": str(initial_version)},
        json={"title": "Open to one page"},
    )
    assert changed.status_code == 200
    assert changed.json()["version"] == initial_version + 1
    stale = client.patch(
        f"/api/tasks/{task['id']}/steps/{step['id']}",
        headers={**owner_headers, "If-Match": str(initial_version)},
        json={"title": "An older title"},
    )
    assert stale.status_code == 409
    assert client.get(f"/api/tasks/{task['id']}", headers=other_headers).status_code == 404
    assert client.get(f"/api/tasks/{task['id']}").status_code == 401

    persisted = db_session.scalar(select(Step).where(Step.id == step["id"]))
    assert persisted.title == "Open to one page"


def test_feedback_replay_is_safe_across_client_retry(client, db_session):
    headers = register(client, "sync-replay@example.test")
    task = client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "Water a plant", "steps": [{"title": "Find the watering can"}]},
    ).json()
    payload = {"action": "done", "step_id": task["steps"][0]["id"]}
    request_headers = {**headers, "Idempotency-Key": "replayed-done-key-01"}

    first = client.post(f"/api/tasks/{task['id']}/feedback", headers=request_headers, json=payload)
    replay = client.post(f"/api/tasks/{task['id']}/feedback", headers=request_headers, json=payload)
    assert first.status_code == replay.status_code == 200
    assert first.json() == replay.json()
    assert db_session.query(Step).filter_by(id=payload["step_id"], status="completed").count() == 1
    assert db_session.query(ActivityEvent).filter_by(
        user_id=task["user_id"], event_type="step_completed"
    ).count() == 1
