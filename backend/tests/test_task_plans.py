import json
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

from backend.app.core import plan_service
from backend.app.core.gemini_sequencer import GeminiClient, GeminiProviderError
from backend.app.core.task_planner import TaskPlan, generate_plan
from backend.app.models.task import Task, Step


def plan_payload(capacity="medium", prefix="Draft", count=3):
    actions = [("Outline report", "List the report headings using the project brief."),
               ("Explain evidence", "Describe the experiment findings in the report body."),
               ("Review report", "Check the report against the submission requirements.")]
    return {"task_title": "Write the project report", "task_description": "Prepare and review the complete project report.",
            "steps": [{"title": f"{prefix}: {title}", "instruction": instruction,
                       "why_this_step": "This creates the next part of the report.", "order": i,
                       "estimated_minutes": {"low": 1, "medium": 5, "high": 15}[capacity],
                       "effort": capacity, "research_suggestions": ["Project report structure"]}
                      for i, (title, instruction) in enumerate(actions[:count], start=1)]}


def provider(payload):
    return {"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(payload)}]}}]}


@pytest.mark.parametrize("capacity", ["low", "medium", "high"])
def test_structured_generation_uses_goal_capacity_and_strategy_context(capacity):
    calls = []
    def handler(request):
        calls.append(json.loads(request.content))
        assert request.headers["x-goog-api-key"] == "test-key"
        return httpx.Response(200, json=provider(plan_payload(capacity)))
    client = GeminiClient(api_key="test-key", transport=httpx.MockTransport(handler), max_retries=0)
    try:
        result = generate_plan(client, goal="Write project report", notes="Use experiment notes",
                               capacity=capacity, strategies=[], history=[])
        assert len(result.steps) == 3
        prompt = json.loads(calls[0]["contents"][0]["parts"][0]["text"])
        assert prompt["goal"] == "Write project report"
        assert prompt["capacity"] == capacity
        assert prompt["notes"] == "Use experiment notes"
        assert calls[0]["generationConfig"]["responseMimeType"] == "application/json"
        if capacity == "low":
            assert calls[0]["generationConfig"]["responseSchema"]["properties"]["steps"]["items"]["properties"]["estimated_minutes"] == {
                "type": "INTEGER", "minimum": 1, "maximum": 1
            }
    finally:
        client.close()


@pytest.mark.parametrize("failure", ["duplicate", "empty", "irrelevant", "duration", "multi_action", "missing", "malformed"])
def test_invalid_generation_retries_then_fails_without_local_fallback(failure):
    calls = []
    payload = plan_payload("low")
    if failure == "duplicate":
        payload["steps"][1]["title"] = payload["steps"][0]["title"]
    if failure == "empty": payload["steps"] = []
    if failure == "irrelevant":
        payload["steps"] = [{**payload["steps"][0], "title": "Boil vegetables", "instruction": "Put carrots in the saucepan."}]
    if failure == "duration": payload["steps"][0]["estimated_minutes"] = 2
    if failure == "multi_action": payload["steps"][0]["instruction"] = "Open the report and read the first section."
    if failure == "missing": del payload["steps"][0]["instruction"]
    def handler(request):
        calls.append(request)
        response = provider(payload)
        if failure == "malformed":
            response["candidates"][0]["content"]["parts"] = [{"text": "not valid JSON"}]
        return httpx.Response(200, json=response)
    client = GeminiClient(api_key="test-key", transport=httpx.MockTransport(handler), max_retries=0)
    try:
        with pytest.raises(GeminiProviderError, match="invalid_plan"):
            generate_plan(client, goal="Write project report", notes="", capacity="low", strategies=[], history=[])
        assert len(calls) == 2
    finally:
        client.close()


@pytest.mark.parametrize("wrapper", ["fence", "prose", "parts"])
def test_plan_parser_accepts_safe_json_wrappers(wrapper):
    payload = plan_payload("low")
    text = json.dumps(payload)
    parts = [{"text": "thinking", "thought": True}, {"text": text}]
    if wrapper == "fence":
        parts = [{"text": "```json\n" + text + "\n```"}]
    elif wrapper == "prose":
        parts = [{"text": "Here is the plan:\n" + text + "\nReview it before starting."}]
    client = GeminiClient(api_key="test-key", transport=httpx.MockTransport(
        lambda request: httpx.Response(200, json={"candidates": [{"finishReason": "STOP", "content": {"parts": parts}}]})), max_retries=0)
    try:
        result = generate_plan(client, goal="Write project report", notes="Use experiment notes",
                               capacity="low", strategies=[], history=[])
        assert len(result.steps) == 3
        assert all(step.estimated_minutes == 1 for step in result.steps)
    finally:
        client.close()


def test_plan_retries_once_then_returns_valid_response():
    calls = []
    invalid = plan_payload("low")
    invalid["steps"][0]["estimated_minutes"] = 2
    valid = plan_payload("low")
    def handler(request):
        calls.append(json.loads(request.content))
        return httpx.Response(200, json=provider(invalid if len(calls) == 1 else valid))
    client = GeminiClient(api_key="test-key", transport=httpx.MockTransport(handler), max_retries=0)
    try:
        result = generate_plan(client, goal="Write project report", notes="Use experiment notes",
                               capacity="low", strategies=[], history=[])
        assert result.steps[0].estimated_minutes == 1
        assert len(calls) == 2
        assert "previous response failed" in calls[1]["contents"][0]["parts"][1]["text"].lower()
    finally:
        client.close()


def test_truncated_gemini_output_is_retried_with_a_bounded_concise_correction():
    calls = []

    def handler(request):
        body = json.loads(request.content)
        calls.append(body)
        if len(calls) == 1:
            return httpx.Response(200, json={"candidates": [{
                "finishReason": "MAX_TOKENS", "content": {"parts": [{"text": "{"}]}
            }]})
        return httpx.Response(200, json=provider(plan_payload("medium")))

    client = GeminiClient(api_key="test-key", transport=httpx.MockTransport(handler), max_retries=0)
    try:
        result = generate_plan(client, goal="Write project report", notes="", capacity="medium",
                               strategies=[], history=[])
        assert len(result.steps) == 3
        assert len(calls) == 2
        retry_instruction = calls[1]["contents"][0]["parts"][-1]["text"]
        assert "truncated_output" in retry_instruction
        assert "Complete the full plan" in retry_instruction
    finally:
        client.close()


def test_gemini_refusal_is_not_reported_as_invalid_plan():
    client = GeminiClient(api_key="test-key", transport=httpx.MockTransport(
        lambda request: httpx.Response(200, json={"candidates": [{
            "finishReason": "SAFETY", "content": {"parts": []}
        }]})), max_retries=0)
    try:
        with pytest.raises(GeminiProviderError, match="blocked_content"):
            generate_plan(client, goal="Write project report", notes="", capacity="medium",
                          strategies=[], history=[])
    finally:
        client.close()


def test_mocked_gemini_response_is_persisted_through_plan_endpoint(client, monkeypatch):
    prompts = []
    payload = plan_payload("low")
    def handler(request):
        prompts.append(json.loads(request.content))
        response = provider(payload)
        response["candidates"][0]["content"]["parts"] = [
            {"text": "```json\n" + json.dumps(payload) + "\n```"}
        ]
        return httpx.Response(200, json=response)
    monkeypatch.setattr(plan_service, "retriever", lambda: SimpleNamespace(retrieve=lambda *a, **k: []))
    monkeypatch.setattr(plan_service, "GeminiClient", lambda: GeminiClient(
        api_key="test-key", model="mock-test-model", transport=httpx.MockTransport(handler), max_retries=0))

    registered = client.post("/api/auth/register", json={"email": "mock-plan-pipeline@steplight.ai", "password": "Password123!"})
    assert registered.status_code == 201
    headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}
    created = client.post("/api/tasks", headers=headers, json={
        "title": "Write project report", "notes": "Use experiment notes", "capacity": "low"
    })
    assert created.status_code == 201
    task = created.json()
    result = client.post(f"/api/tasks/{task['id']}/plan", headers={
        **headers, "If-Match": str(task["version"])
    }, json={"consent": True})
    assert result.status_code == 200, result.text
    saved = result.json()
    assert saved["original_input"] == "Write project report"
    assert saved["notes"] == "Use experiment notes"
    assert saved["capacity"] == "low"
    assert saved["plan_model"] == "mock-test-model"
    assert [step["order"] for step in saved["steps"]] == [1, 2, 3]
    assert all(step["source"] == "GEMINI" and step["estimated_duration"] == 60 for step in saved["steps"])
    context = json.loads(prompts[0]["contents"][0]["parts"][0]["text"])
    assert (context["goal"], context["notes"], context["capacity"]) == (
        "Write project report", "Use experiment notes", "low"
    )


@pytest.fixture
def planned_task(client, monkeypatch):
    # Deterministic test doubles exercise storage/transitions, not live AI quality.
    def generated(task, **kwargs):
        cap = "low" if kwargs.get("mode") == "cant" else kwargs.get("capacity") or task.capacity
        prefix = "Revise" if task.plan_model else "Draft"
        if kwargs.get("mode") == "cant": prefix = "Outline"
        if kwargs.get("mode") == "another": prefix = "Summarize"
        count = 1 if kwargs.get("mode") == "another" else 2 if kwargs.get("mode") == "cant" else 3
        return TaskPlan.model_validate(plan_payload(cap, prefix, count)), "test-model", True
    monkeypatch.setattr(plan_service, "generate", generated)
    registered = client.post("/api/auth/register", json={"email": "plan-route@steplight.ai", "password": "Password123!"})
    # Fixtures share a session database; ensure unique accounts across tests.
    if registered.status_code != 201:
        registered = client.post("/api/auth/login", json={"email": "plan-route@steplight.ai", "password": "Password123!"})
    headers = {"Authorization": f"Bearer {registered.json()['access_token']}"}
    task = client.post("/api/tasks", headers=headers, json={"title": "Write project report", "capacity": "medium"}).json()
    response = client.post(f"/api/tasks/{task['id']}/plan", headers={**headers, "If-Match": str(task["version"])}, json={"consent": True})
    assert response.status_code == 200, response.text
    return response.json(), headers


def test_plan_persistence_progress_adaptation_and_completion(client, planned_task):
    task, headers = planned_task
    assert task["original_input"] == "Write project report"
    assert task["plan_model"] == "test-model"
    assert all(s["source"] == "GEMINI" and s["instruction"] for s in task["steps"])
    path = f"/api/tasks/{task['id']}"
    first = task["steps"][0]
    done = client.post(path + "/feedback", headers={**headers, "Idempotency-Key": "plan-done-first"}, json={"action": "done", "step_id": first["id"]})
    assert done.status_code == 200
    latest = client.get(path, headers=headers).json()
    adapted = client.post(path + "/plan", headers={**headers, "If-Match": str(latest["version"])}, json={"consent": True, "capacity": "low"})
    assert adapted.status_code == 200, adapted.text
    steps = adapted.json()["steps"]
    kept = next(s for s in steps if s["id"] == first["id"])
    assert kept["status"] == "completed" and kept["completed_at"]
    assert len([s for s in steps if s["status"] == "skipped"]) == 2
    for step in steps:
        if step["status"] == "pending":
            assert step["estimated_duration"] <= 180
            assert client.post(path + "/feedback", headers={**headers, "Idempotency-Key": "done-" + step["id"]}, json={"action": "done", "step_id": step["id"]}).status_code == 200
    assert client.get(path + "/suggest-step", headers=headers).status_code == 409
    assert client.get(path, headers=headers).json()["status"] == "active"
    assert client.patch(path, headers=headers, json={"status": "completed"}).status_code == 200


def test_adaptive_actions_are_saved_idempotent_and_do_not_repeat_rejected_steps(client, planned_task):
    task, headers = planned_task
    path = f"/api/tasks/{task['id']}"
    step = task["steps"][0]
    for action in ("cant", "another"):
        action_headers = {**headers, "Idempotency-Key": "plan-" + action + step["id"]}
        result = client.post(path + "/feedback", headers=action_headers, json={"action": action, "step_id": step["id"]})
        assert result.status_code == 200, result.text
        assert result.json() == client.post(path + "/feedback", headers=action_headers, json={"action": action, "step_id": step["id"]}).json()
        latest = client.get(path, headers=headers).json()
        assert next(s for s in latest["steps"] if s["id"] == step["id"])["status"] == "skipped"
        step = result.json()["step"]
        assert step["source"] == "GEMINI"
        assert next(s for s in latest["steps"] if s["status"] == "pending")["id"] == step["id"]
    assert client.post(path + "/feedback", headers={**headers, "Idempotency-Key": "plan-rest-action"}, json={"action": "rest"}).status_code == 200
    assert client.get(path, headers=headers).json()["status"] == "paused"
    assert client.patch(path, headers=headers, json={"status": "active"}).status_code == 200
    before = client.get(path, headers=headers).json()
    assert client.post(path + "/feedback", headers={**headers, "Idempotency-Key": "plan-dismiss-action"}, json={"action": "dismiss", "step_id": step["id"]}).status_code == 200
    assert client.get(path, headers=headers).json()["steps"] == before["steps"]


def test_generation_failure_and_stale_versions_preserve_all_work(client, planned_task, monkeypatch):
    task, headers = planned_task
    path = f"/api/tasks/{task['id']}"
    def unavailable(*args, **kwargs): raise HTTPException(503, "Gemini unavailable. Retry.")
    monkeypatch.setattr(plan_service, "generate", unavailable)
    for endpoint, data, extra in [
        ("/plan", {"consent": True}, {"If-Match": str(task["version"])}),
        ("/feedback", {"action": "cant", "step_id": task["steps"][0]["id"]}, {"Idempotency-Key": "failed-generation"}),
    ]:
        assert client.post(path + endpoint, headers={**headers, **extra}, json=data).status_code == 503
        assert client.get(path, headers=headers).json() == task
    assert client.post(path + "/plan", headers={**headers, "If-Match": "0"}, json={"consent": True}).status_code == 409
    assert client.post(path + "/plan", headers={**headers, "If-Match": str(task["version"])}, json={"consent": False}).status_code == 422
    assert client.post(path + "/plan", json={"consent": True}).status_code == 401


def test_provider_quota_failure_is_retryable_and_preserves_plan(client, planned_task, monkeypatch):
    task, headers = planned_task
    # Restore the real service generator but inject an HTTP-level provider failure.
    monkeypatch.undo()
    monkeypatch.setattr(plan_service, "retriever", lambda: SimpleNamespace(retrieve=lambda *a, **k: []))
    monkeypatch.setattr(plan_service, "GeminiClient", lambda: GeminiClient(
        api_key="test-key", transport=httpx.MockTransport(lambda request: httpx.Response(429, json={})), max_retries=0))
    path = f"/api/tasks/{task['id']}"
    result = client.post(path + "/plan", headers={**headers, "If-Match": str(task["version"])}, json={"consent": True})
    assert result.status_code == 503
    assert "quota" in result.json()["detail"] and "retry" in result.json()["detail"]
    assert client.get(path, headers=headers).json() == task
