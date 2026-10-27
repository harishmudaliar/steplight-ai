import pytest
from sqlalchemy import select

from backend.app.api import tasks as task_api
from backend.app.core.strategy_retrieval import StrategyMatch
from backend.app.models.task import Task
from backend.app.models.activity import ActivityEvent, StepFeedbackEvent


def register_user(client, email):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "TaskLifecyclePassword123"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_task_crud_status_activity_and_persistence(client, setup_test_db):
    headers = register_user(client, "lifecycle@steplight.ai")
    created = client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "  Sort the desk  ", "notes": "Keep one corner clear", "capacity": "low"},
    )
    assert created.status_code == 201
    task = created.json()
    assert task["title"] == "Sort the desk"
    assert task["status"] == "active"

    edited = client.patch(
        f"/api/tasks/{task['id']}",
        headers=headers,
        json={"title": "Clear one small space", "capacity": "medium"},
    )
    assert edited.status_code == 200
    assert edited.json()["title"] == "Clear one small space"
    assert edited.json()["capacity"] == "medium"

    cleared_notes = client.patch(
        f"/api/tasks/{task['id']}",
        headers=headers,
        json={"notes": ""},
    )
    assert cleared_notes.status_code == 200
    assert cleared_notes.json()["notes"] is None

    for status_value in ("paused", "active", "completed", "archived"):
        transitioned = client.patch(
            f"/api/tasks/{task['id']}",
            headers=headers,
            json={"status": status_value},
        )
        assert transitioned.status_code == 200
        assert transitioned.json()["status"] == status_value

    events = client.get("/api/activity", headers=headers).json()
    assert {event["event_type"] for event in events} >= {
        "task_created", "task_updated", "task_paused", "task_resumed", "task_completed", "task_archived"
    }

    with setup_test_db() as restarted_session:
        persisted = restarted_session.scalar(select(Task).where(Task.id == task["id"]))
        assert persisted is not None
        assert persisted.status == "archived"
        assert persisted.title == "Clear one small space"

    deleted = client.delete(f"/api/tasks/{task['id']}", headers=headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/tasks/{task['id']}", headers=headers).status_code == 404


def test_task_validation_and_legacy_status_alias(client):
    headers = register_user(client, "validation@steplight.ai")
    invalid_inputs = [
        {"title": "   "},
        {"title": "x" * 256},
        {"title": "Valid", "notes": "x" * 2001},
        {"title": "Valid", "capacity": "extreme"},
    ]
    for payload in invalid_inputs:
        response = client.post("/api/tasks", headers=headers, json=payload)
        assert response.status_code == 422

    created = client.post("/api/tasks", headers=headers, json={"title": "Legacy status"})
    task_id = created.json()["id"]
    legacy_status = client.patch(
        f"/api/tasks/{task_id}",
        headers=headers,
        json={"status": "in_progress"},
    )
    assert legacy_status.status_code == 200
    assert legacy_status.json()["status"] == "active"

    invalid_update = client.patch(
        f"/api/tasks/{task_id}",
        headers=headers,
        json={"title": " \t "},
    )
    assert invalid_update.status_code == 422


def test_task_pagination_filters_counts_and_suggestions(client, monkeypatch):
    headers = register_user(client, "pagination@steplight.ai")
    task_ids = []
    for index, capacity in enumerate(("low", "medium", "high")):
        response = client.post(
            "/api/tasks",
            headers=headers,
            json={"title": f"Paper task {index}", "capacity": capacity},
        )
        assert response.status_code == 201
        task_ids.append(response.json()["id"])

    client.patch(f"/api/tasks/{task_ids[1]}", headers=headers, json={"status": "paused"})
    first_page = client.get("/api/tasks?page=1&page_size=2", headers=headers).json()
    assert first_page["total"] == 3
    assert len(first_page["tasks"]) == 2
    assert first_page["page"] == 1
    assert first_page["pages"] == 2
    second_page = client.get("/api/tasks?page=2&page_size=2", headers=headers).json()
    assert len(second_page["tasks"]) == 1

    filtered = client.get("/api/tasks?status=paused&capacity=medium&search=paper", headers=headers).json()
    assert filtered["total"] == 1
    assert filtered["tasks"][0]["id"] == task_ids[1]
    assert client.get("/api/tasks?status=invalid", headers=headers).status_code == 422
    assert client.get("/api/tasks?page=1&page_size=101", headers=headers).status_code == 422

    counts = client.get("/api/tasks/counts", headers=headers).json()
    assert counts == {"active": 2, "paused": 1, "completed": 0, "archived": 0, "total": 3}
    class UnavailableRetriever:
        def retrieve(self, query_text, capacity, top_k):
            raise task_api.StrategyIndexUnavailable("test index absent")

    monkeypatch.setattr(task_api, "_get_strategy_retriever", UnavailableRetriever)
    suggestion = client.get(f"/api/tasks/{task_ids[0]}/suggest-step", headers=headers).json()
    assert suggestion["source"] == "LOCAL_FALLBACK"
    assert suggestion["fallback_notice"]


def test_suggestion_uses_local_strategy_match_without_logging_private_query(client, monkeypatch, caplog):
    headers = register_user(client, "strategy-match@steplight.ai")
    private_marker = "private-context-marker-91c"
    created = client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "Draft a private note", "notes": private_marker, "capacity": "low"},
    )
    task_id = created.json()["id"]

    class TestRetriever:
        def retrieve(self, query_text, capacity, top_k):
            assert private_marker in query_text
            assert capacity == "low"
            assert top_k == task_api.settings.STRATEGY_RETRIEVAL_TOP_K
            return [
                StrategyMatch(
                    strategy_id="write_first_sentence",
                    name="Write one rough sentence",
                    use_case="Writing",
                    capacity_fit=("low", "medium"),
                    sample="Write one rough sentence.",
                    caution="Editing is not required.",
                    score=0.83,
                )
            ]

    monkeypatch.setattr(task_api, "_get_strategy_retriever", TestRetriever)
    monkeypatch.setattr(
        task_api,
        "GeminiClient",
        lambda: pytest.fail("Gemini must not be called while preference is off."),
    )
    response = client.get(f"/api/tasks/{task_id}/suggest-step", headers=headers)

    assert response.status_code == 200
    assert response.json()["source"] == "LOCAL_RAG"
    assert response.json()["retrieval_score"] == 0.83
    assert private_marker not in caplog.text


def test_suggestion_uses_deterministic_fallback_when_no_strategy_matches(client, monkeypatch):
    headers = register_user(client, "strategy-fallback@steplight.ai")
    created = client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "Unusual task", "capacity": "medium"},
    )
    task_id = created.json()["id"]

    class EmptyRetriever:
        def retrieve(self, query_text, capacity, top_k):
            return []

    monkeypatch.setattr(task_api, "_get_strategy_retriever", EmptyRetriever)
    response = client.get(f"/api/tasks/{task_id}/suggest-step", headers=headers)

    assert response.status_code == 200
    assert response.json()["source"] == "LOCAL_FALLBACK"
    assert "No sufficiently relevant local strategy" in response.json()["fallback_notice"]


def test_task_ownership_includes_list_and_delete(client):
    owner_headers = register_user(client, "owner@steplight.ai")
    other_headers = register_user(client, "other@steplight.ai")
    created = client.post("/api/tasks", headers=owner_headers, json={"title": "Private task"})
    task_id = created.json()["id"]

    assert client.get(f"/api/tasks/{task_id}", headers=other_headers).status_code == 404
    assert client.patch(
        f"/api/tasks/{task_id}", headers=other_headers, json={"status": "completed"}
    ).status_code == 404
    assert client.delete(f"/api/tasks/{task_id}", headers=other_headers).status_code == 404
    other_tasks = client.get("/api/tasks", headers=other_headers).json()
    assert other_tasks["total"] == 0
    assert client.get(f"/api/tasks/{task_id}", headers=owner_headers).status_code == 200


def create_step_task(client, email):
    headers = register_user(client, email)
    response = client.post(
        "/api/tasks",
        headers=headers,
        json={
            "title": "Prepare a short note",
            "capacity": "low",
            "steps": [{"title": "Open the draft"}],
        },
    )
    assert response.status_code == 201
    return headers, response.json()


def send_feedback(client, headers, task_id, action, step_id=None, key="phase7-key-0001"):
    return client.post(
        f"/api/tasks/{task_id}/feedback",
        headers={**headers, "Idempotency-Key": key},
        json={"action": action, "step_id": step_id},
    )


def test_feedback_done_is_idempotent_and_does_not_complete_task(client, setup_test_db):
    headers, task = create_step_task(client, "feedback-done@steplight.ai")
    step_id = task["steps"][0]["id"]

    first = send_feedback(client, headers, task["id"], "done", step_id)
    replay = send_feedback(client, headers, task["id"], "done", step_id)

    assert first.status_code == 200
    assert replay.status_code == 200
    assert replay.json() == first.json()
    assert first.json()["state"] == "completed"
    assert first.json()["task_status"] == "active"
    assert first.json()["step"]["status"] == "completed"

    with setup_test_db() as db:
        events = (
            db.query(ActivityEvent)
            .filter(ActivityEvent.event_type == "step_completed")
            .filter(ActivityEvent.metadata_json.contains(task["id"]))
            .all()
        )
        assert len(events) == 1
        assert db.query(StepFeedbackEvent).filter(
            StepFeedbackEvent.user_id == task["user_id"]
        ).count() == 1

    conflicting = send_feedback(
        client, headers, task["id"], "done", step_id, key="phase7-key-0002"
    )
    assert conflicting.status_code == 409
    mismatched_key = send_feedback(
        client, headers, task["id"], "dismiss", step_id, key="phase7-key-0001"
    )
    assert mismatched_key.status_code == 409


def test_repeated_cant_creates_different_local_steps(client):
    headers, task = create_step_task(client, "feedback-cant@steplight.ai")
    rejected_id = task["steps"][0]["id"]

    first = send_feedback(client, headers, task["id"], "cant", rejected_id, "phase7-cant-0001")
    assert first.status_code == 200
    smaller_step = first.json()["step"]
    assert smaller_step["status"] == "pending"
    assert smaller_step["estimated_duration"] == 15
    assert "generated locally" in smaller_step["reason"]
    assert smaller_step["title"] != task["steps"][0]["title"]

    second = send_feedback(
        client, headers, task["id"], "cant", smaller_step["id"], "phase7-cant-0002"
    )
    assert second.status_code == 200
    assert second.json()["step"]["title"] != smaller_step["title"]

    stored = client.get(f"/api/tasks/{task['id']}", headers=headers).json()
    assert {step["status"] for step in stored["steps"]} == {"pending", "skipped"}


def test_rest_is_persisted_and_can_resume_after_new_session(client, setup_test_db):
    headers, task = create_step_task(client, "feedback-rest@steplight.ai")
    response = send_feedback(
        client, headers, task["id"], "rest", task["steps"][0]["id"], "phase7-rest-0001"
    )
    assert response.status_code == 200
    assert response.json()["task_status"] == "paused"

    with setup_test_db() as restarted_session:
        persisted = restarted_session.scalar(select(Task).where(Task.id == task["id"]))
        assert persisted.status == "paused"
        assert persisted.steps[0].status == "pending"

    resumed = client.patch(
        f"/api/tasks/{task['id']}",
        headers=headers,
        json={"status": "active"},
    )
    assert resumed.status_code == 200
    assert resumed.json()["steps"][0]["status"] == "pending"


def test_change_and_dismiss_preserve_nonpunitive_task_state(client):
    headers, change_task = create_step_task(client, "feedback-change@steplight.ai")
    changed = send_feedback(
        client, headers, change_task["id"], "change", change_task["steps"][0]["id"],
        "phase7-change-0001",
    )
    assert changed.status_code == 200
    assert changed.json()["state"] == "change_requested"
    updated = client.patch(
        f"/api/tasks/{change_task['id']}",
        headers=headers,
        json={"title": "Write one short sentence", "capacity": "medium"},
    )
    assert updated.status_code == 200
    assert updated.json()["capacity"] == "medium"
    assert updated.json()["title"] == "Write one short sentence"
    assert updated.json()["steps"][0]["status"] == "skipped"

    headers, dismiss_task = create_step_task(client, "feedback-dismiss@steplight.ai")
    dismissed = send_feedback(
        client, headers, dismiss_task["id"], "dismiss", dismiss_task["steps"][0]["id"],
        "phase7-dismiss-0001",
    )
    assert dismissed.status_code == 200
    assert dismissed.json()["state"] == "dismissed"
    unchanged = client.get(f"/api/tasks/{dismiss_task['id']}", headers=headers).json()
    assert unchanged["status"] == "active"
    assert unchanged["steps"][0]["status"] == "pending"


def test_feedback_completion_race_records_one_completion(client, setup_test_db):
    from concurrent.futures import ThreadPoolExecutor
    from fastapi.testclient import TestClient
    from backend.app.database import get_db
    from backend.app.main import app

    headers, task = create_step_task(client, "feedback-race@steplight.ai")
    step_id = task["steps"][0]["id"]

    def override_db():
        session = setup_test_db()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db

    def complete(index):
        with TestClient(app, raise_server_exceptions=False) as concurrent_client:
            return concurrent_client.post(
                f"/api/tasks/{task['id']}/feedback",
                headers={**headers, "Idempotency-Key": f"phase7-race-{index:04d}"},
                json={"action": "done", "step_id": step_id},
            )

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(complete, (1, 2)))

    assert sorted(response.status_code for response in responses) == [200, 409]
    with setup_test_db() as db:
        events = (
            db.query(ActivityEvent)
            .filter(ActivityEvent.event_type == "step_completed")
            .filter(ActivityEvent.metadata_json.contains(task["id"]))
            .all()
        )
        assert len(events) == 1


def test_step_patch_completion_is_concurrency_safe_and_keeps_completion_time(client, setup_test_db):
    headers, task = create_step_task(client, "step-patch-completion@steplight.ai")
    step_id = task["steps"][0]["id"]
    first = client.patch(
        f"/api/tasks/{task['id']}/steps/{step_id}",
        headers=headers,
        json={"status": "completed"},
    )
    second = client.patch(
        f"/api/tasks/{task['id']}/steps/{step_id}",
        headers=headers,
        json={"status": "completed"},
    )

    assert first.status_code == second.status_code == 200
    assert first.json()["completed_at"] == second.json()["completed_at"]
    with setup_test_db() as db:
        events = (
            db.query(ActivityEvent)
            .filter(ActivityEvent.event_type == "step_completed")
            .filter(ActivityEvent.metadata_json.contains(task["id"]))
            .all()
        )
        assert len(events) == 1
