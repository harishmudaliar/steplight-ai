import json
import logging

import httpx
import pytest
from sqlalchemy import select

from backend.app.api import tasks as task_api
from backend.app.core.gemini_sequencer import (
    GeminiClient,
    GeminiProviderError,
    GeneratedStep,
)
from backend.app.core.strategy_retrieval import StrategyMatch
from backend.app.models.task import StepGeneration


STRATEGY = StrategyMatch(
    strategy_id="open_project_brief",
    name="Open the project brief",
    use_case="Writing and planning",
    capacity_fit=("low", "medium"),
    sample="Open the project brief.",
    caution="One small action is enough.",
    score=0.82,
)


def provider_response(
    *,
    action="Open the project brief.",
    why="Opening the brief gives you a clear place to begin.",
    strategy_id="open_project_brief",
    safety=None,
):
    payload = {
        "action": action,
        "why": why,
        "strategy_id": strategy_id,
        "safety": safety or {
            "non_diagnostic": True,
            "optional": True,
            "single_action": True,
        },
    }
    return {
        "candidates": [{
            "finishReason": "STOP",
            "content": {"parts": [{"text": json.dumps(payload)}]},
        }],
        "usageMetadata": {"promptTokenCount": 40, "candidatesTokenCount": 20},
    }


def make_client(handler, *, max_retries=0):
    return GeminiClient(
        api_key="test-key-never-log",
        model="gemini-3.8-flash",
        max_retries=max_retries,
        transport=httpx.MockTransport(handler),
        sleep=lambda _: None,
    )


def call_generate(client):
    return client.generate(
        task_title="Prepare project brief",
        task_context="Gather the launch notes",
        capacity="low",
        candidates=[STRATEGY],
        preferred_duration_minutes=2,
    )


def test_gemini_success_returns_guarded_step_and_token_metadata(monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger="backend.app.core.gemini_sequencer")
    monkeypatch.setattr(task_api.settings, "GEMINI_INPUT_COST_PER_MILLION", 1.0)
    monkeypatch.setattr(task_api.settings, "GEMINI_OUTPUT_COST_PER_MILLION", 2.0)

    def handler(request):
        assert request.headers["x-goog-api-key"] == "test-key-never-log"
        assert b"Gather the launch notes" in request.content
        return httpx.Response(
            200,
            json=provider_response(),
            headers={"x-goog-request-id": "req-test-1"},
        )

    client = make_client(handler)
    try:
        generated = call_generate(client)
    finally:
        client.close()

    assert generated.action == "Open the project brief."
    assert generated.strategy_id == STRATEGY.strategy_id
    assert generated.guard_metadata["passed"] is True
    assert generated.input_tokens == 40
    assert generated.output_tokens == 20
    assert generated.estimated_cost_usd == 0.00008
    assert generated.request_id == "req-test-1"
    assert "input_tokens=40" in caplog.text
    assert "test-key-never-log" not in caplog.text
    assert "Gather the launch notes" not in caplog.text


def test_model_availability_requires_generate_content_support():
    client = make_client(
        lambda request: httpx.Response(
            200,
            json={
                "name": "models/gemini-3.8-flash",
                "displayName": "Gemini 3.8 Flash",
                "supportedGenerationMethods": ["generateContent"],
            },
        )
    )
    try:
        assert client.validate_model_available()["name"] == "models/gemini-3.8-flash"
    finally:
        client.close()

    unsupported = make_client(
        lambda request: httpx.Response(
            200,
            json={
                "name": "models/example",
                "supportedGenerationMethods": ["countTokens"],
            },
        )
    )
    try:
        with pytest.raises(GeminiProviderError) as error:
            unsupported.validate_model_available()
    finally:
        unsupported.close()
    assert error.value.category == "model_generation_unavailable"


@pytest.mark.parametrize(
    ("handler", "expected_category"),
    [
        (
            lambda request: httpx.Response(
                200,
                json={"candidates": [{"content": {"parts": [{"text": "{bad json"}]}}]},
            ),
            "malformed_json",
        ),
        (
            lambda request: (_ for _ in ()).throw(httpx.ReadTimeout("timeout")),
            "timeout",
        ),
        (
            lambda request: httpx.Response(429, json={"error": {"message": "private provider body"}}),
            "quota",
        ),
        (
            lambda request: httpx.Response(
                200,
                json={"promptFeedback": {"blockReason": "SAFETY"}},
            ),
            "blocked_content",
        ),
        (
            lambda request: httpx.Response(
                200,
                json=provider_response(action="Open the brief and write a long summary"),
            ),
            "quality_guard",
        ),
    ],
)
def test_gemini_rejects_provider_and_quality_failures(handler, expected_category):
    client = make_client(handler)
    try:
        with pytest.raises(GeminiProviderError) as error:
            call_generate(client)
    finally:
        client.close()
    assert error.value.category == expected_category


def test_gemini_prompt_contains_only_task_context_and_bounded_opt_in_preference():
    from backend.app.core.gemini_sequencer import build_prompt

    prompt = json.loads(build_prompt(
        task_title="Prepare project brief",
        task_context="x" * 1300,
        capacity="low",
        candidates=[STRATEGY],
        preferred_duration_minutes=2,
    ))
    assert len(prompt["task"]["context"]) == 1200
    assert prompt["opt_in_preferences"] == {"preferred_duration_minutes": 2}
    assert len(prompt["retrieved_strategies"]) == 1
    assert prompt["retrieved_strategies"][0] == {
        "strategy_id": "open_project_brief",
        "name": "Open the project brief",
        "use_case": "Writing and planning",
        "sample": "Open the project brief.",
        "capacity_fit": ["low", "medium"],
        "relevance_score": 0.82,
    }
    assert "secret" not in json.dumps(prompt).lower()


def register_user(client, email):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "TaskLifecyclePassword123"},
    )
    assert response.status_code == 201
    access_token = response.json()["access_token"]
    return {"Authorization": "Bearer " + access_token}


def test_suggestion_gemini_opt_in_persists_metadata_without_task_text(client, monkeypatch, db_session):
    headers = register_user(client, "gemini-opt-in@steplight.ai")
    private_text = "private-prompt-marker-6f42"
    task = client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "Prepare project brief", "notes": private_text, "capacity": "low"},
    ).json()
    assert client.put(
        "/api/preferences",
        headers=headers,
        json={"gemini_personalization_enabled": True},
    ).json()["gemini_personalization_enabled"] is True

    class Retriever:
        def retrieve(self, query_text, capacity, top_k):
            assert private_text in query_text
            return [STRATEGY]

    class Gemini:
        def __init__(self):
            pass

        def generate(self, **kwargs):
            assert kwargs["task_context"] == private_text
            return GeneratedStep(
                action="Open the project brief",
                why="Opening the brief gives you a clear place to begin.",
                strategy_id=STRATEGY.strategy_id,
                input_tokens=40,
                output_tokens=20,
                estimated_cost_usd=0.00008,
                request_id="req-local-test",
                guard_metadata={"version": "1.0", "passed": True, "reasons": []},
                model="gemini-3.8-flash",
            )

        def close(self):
            pass

    monkeypatch.setattr(task_api, "_get_strategy_retriever", Retriever)
    monkeypatch.setattr(task_api, "GeminiClient", Gemini)
    result = client.get(f"/api/tasks/{task['id']}/suggest-step", headers=headers)

    assert result.status_code == 200
    assert result.json()["source"] == "GEMINI"
    assert result.json()["model"] == "gemini-3.8-flash"
    record = db_session.scalar(
        select(StepGeneration).where(StepGeneration.task_id == task["id"])
    )
    assert record is not None
    assert record.guard_passed is True
    assert record.input_tokens == 40
    assert private_text not in record.metadata_json
    assert private_text not in json.dumps({
        "source": record.source,
        "model": record.model,
        "strategy": record.strategy_id,
        "metadata": record.metadata_json,
    })


def test_suggestion_uses_safe_local_fallback_for_gemini_quota(client, monkeypatch):
    headers = register_user(client, "gemini-fallback@steplight.ai")
    task = client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "Prepare project brief", "capacity": "low"},
    ).json()
    client.put(
        "/api/preferences",
        headers=headers,
        json={"gemini_personalization_enabled": True},
    )

    class Retriever:
        def retrieve(self, query_text, capacity, top_k):
            return [STRATEGY]

    class Gemini:
        def __init__(self):
            pass

        def generate(self, **kwargs):
            raise GeminiProviderError("quota")

        def close(self):
            pass

    monkeypatch.setattr(task_api, "_get_strategy_retriever", Retriever)
    monkeypatch.setattr(task_api, "GeminiClient", Gemini)
    response = client.get(f"/api/tasks/{task['id']}/suggest-step", headers=headers)

    assert response.status_code == 200
    assert response.json()["source"] == "LOCAL_FALLBACK"
    assert response.json()["fallback_reason"] == "quota"
    assert response.json()["generation_id"]
