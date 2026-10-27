from backend.app.models.activity import ActivityEvent, Feedback, StepFeedbackEvent
from backend.app.models.auth import SessionModel
from backend.app.models.task import StepGeneration, Task
from backend.app.models.user import User


def register_user(client, email):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "PhaseEightPassword123"},
    )
    assert response.status_code == 201
    return {"Authorization": "Bear" + "er " + response.json()["access_token"]}


def test_activity_is_owner_scoped_filtered_and_paginated(client, db_session):
    owner = register_user(client, "phase8-owner@steplight.ai")
    other = register_user(client, "phase8-other@steplight.ai")
    forged = client.post(
        "/api/activity",
        headers=owner,
        json={"event_type": "step_completed"},
    )
    assert forged.status_code == 422

    task = client.post(
        "/api/tasks",
        headers=owner,
        json={"title": "Read a page", "steps": [{"title": "Open the book"}]},
    ).json()
    step = task["steps"][0]
    completed = client.post(
        f"/api/tasks/{task['id']}/feedback",
        headers={**owner, "Idempotency-Key": "phase8-step-done-key"},
        json={"action": "done", "step_id": step["id"]},
    )
    assert completed.status_code == 200

    summary = client.get("/api/activity/summary", headers=owner).json()
    assert summary == {
        "total_events": 2,
        "step_completions": 1,
        "pauses": 0,
        "resumes": 0,
        "tasks_created": 1,
    }
    stored_count = db_session.query(ActivityEvent).filter(
        ActivityEvent.user_id == task["user_id"]
    ).count()
    assert summary["total_events"] == stored_count

    page = client.get("/api/activity?page=1&page_size=1", headers=owner).json()
    assert page["total"] == 2
    assert page["pages"] == 2
    assert len(page["events"]) == 1
    step_page = client.get("/api/activity?category=steps", headers=owner).json()
    assert step_page["total"] == 1
    assert {event["event_type"] for event in step_page["events"]} == {"step_completed"}

    other_summary = client.get("/api/activity/summary", headers=other).json()
    assert other_summary["total_events"] == 0
    assert client.get("/api/activity", headers=other).json() == []


def test_export_contains_account_records_and_excludes_credentials(
    client, db_session
):
    headers = register_user(client, "phase8-export@steplight.ai")
    other_headers = register_user(client, "phase8-export-other@steplight.ai")
    task = client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "Write a note", "notes": "Keep it small", "capacity": "low"},
    ).json()
    user = db_session.query(User).filter(User.email == "phase8-export@steplight.ai").one()
    generation = StepGeneration(
        task_id=task["id"],
        source="LOCAL_RAG",
        model=None,
        strategy_id="open_document",
        guard_version="1.0",
        guard_passed=True,
        metadata_json='{"capacity":"low"}',
    )
    db_session.add(generation)
    db_session.commit()
    step_response = client.post(
        f"/api/tasks/{task['id']}/steps",
        headers=headers,
        json={
            "title": "Open the document",
            "strategy": "open_document",
            "generation_id": generation.id,
        },
    )
    assert step_response.status_code == 201
    step = step_response.json()
    assert step["source"] == "LOCAL_RAG"
    assert step["generation_id"] == generation.id
    client.post(
        "/api/activity/feedback",
        headers=headers,
        json={
            "task_id": task["id"],
            "step_id": step["id"],
            "rating": 5,
            "commentary": "This felt manageable.",
        },
    )

    preferences = client.get("/api/preferences", headers=headers)
    assert preferences.status_code == 200
    assert preferences.json()["gemini_personalization_enabled"] is False

    export_response = client.get("/api/privacy/export", headers=headers)
    assert export_response.status_code == 200
    data = export_response.json()
    assert data["account"]["email"] == user.email
    assert len(data["tasks"]) == 1
    assert data["tasks"][0]["steps"][0]["source"] == "LOCAL_RAG"
    assert data["tasks"][0]["steps"][0]["generation_id"] == generation.id
    assert len(data["activity_events"]) == 2
    assert len(data["feedback"]) == 1
    assert len(data["step_generations"]) == 1
    assert data["preferences"]["gemini_personalization_enabled"] is False
    serialized = str(data)
    assert "hashed_password" not in serialized
    assert "refresh_token" not in serialized
    assert "token_hash" not in serialized
    assert "request_fingerprint" not in serialized
    assert "automatic age-based purge" in data["retention"]
    other_export = client.get("/api/privacy/export", headers=other_headers).json()
    assert other_export["tasks"] == []
    assert other_export["activity_events"] == []


def test_feedback_rejects_foreign_task_and_account_deletion_cascades(client, db_session):
    owner = register_user(client, "phase8-delete-owner@steplight.ai")
    other = register_user(client, "phase8-delete-other@steplight.ai")
    task = client.post(
        "/api/tasks",
        headers=owner,
        json={"title": "Private task", "steps": [{"title": "First action"}]},
    ).json()
    step = task["steps"][0]
    generation = StepGeneration(
        task_id=task["id"],
        source="LOCAL_FALLBACK",
        model=None,
        strategy_id="small_start",
        guard_version="1.0",
        guard_passed=True,
        metadata_json='{"capacity":"medium"}',
    )
    db_session.add(generation)
    db_session.commit()
    paused = client.post(
        f"/api/tasks/{task['id']}/feedback",
        headers={**owner, "Idempotency-Key": "phase8-delete-rest-key"},
        json={"action": "rest", "step_id": step["id"]},
    )
    assert paused.status_code == 200
    foreign_feedback = client.post(
        "/api/activity/feedback",
        headers=other,
        json={"task_id": task["id"], "step_id": step["id"], "rating": 4},
    )
    assert foreign_feedback.status_code == 404

    invalid_delete = client.request(
        "DELETE",
        "/api/auth/me",
        headers=owner,
        json={"password": "WrongPhaseEightPassword"},
    )
    assert invalid_delete.status_code == 401
    assert client.get(f"/api/tasks/{task['id']}", headers=owner).status_code == 200

    valid_delete = client.request(
        "DELETE",
        "/api/auth/me",
        headers=owner,
        json={"password": "PhaseEightPassword123"},
    )
    assert valid_delete.status_code == 204

    assert db_session.query(User).filter(User.email == "phase8-delete-owner@steplight.ai").count() == 0
    assert db_session.query(Task).filter(Task.id == task["id"]).count() == 0
    assert db_session.query(ActivityEvent).filter(ActivityEvent.user_id == task["user_id"]).count() == 0
    assert db_session.query(Feedback).filter(Feedback.user_id == task["user_id"]).count() == 0
    assert db_session.query(StepFeedbackEvent).filter(
        StepFeedbackEvent.user_id == task["user_id"]
    ).count() == 0
    assert db_session.query(StepGeneration).filter(
        StepGeneration.task_id == task["id"]
    ).count() == 0
    assert db_session.query(SessionModel).filter(
        SessionModel.user_id == task["user_id"]
    ).count() == 0
    assert client.get("/api/auth/me", headers=owner).status_code == 401
    assert client.get("/api/auth/me", headers=other).status_code == 200
