"""Make one synthetic, non-personal Gemini generation call."""

import sys

from backend.app.config import settings
from backend.app.core.gemini_sequencer import GeminiClient, GeminiProviderError
from backend.app.core.strategy_retrieval import StrategyMatch


def main() -> int:
    if not settings.GEMINI_API_KEY:
        print("Gemini smoke check not run: GEMINI_API_KEY is not configured.")
        return 1

    candidate = StrategyMatch(
        strategy_id="open_blank_note",
        name="Open a blank note",
        use_case="Starting a writing task",
        capacity_fit=("low", "medium"),
        sample="Open a blank note.",
        caution="One small action is enough.",
        score=1.0,
    )
    client = None
    try:
        client = GeminiClient()
        result = client.generate(
            task_title="Write a short sample note",
            task_context="Synthetic smoke-test content only.",
            capacity="low",
            candidates=[candidate],
            preferred_duration_minutes=2,
        )
    except (GeminiProviderError, ValueError) as exc:
        category = exc.category if isinstance(exc, GeminiProviderError) else "configuration"
        status = (
            f" (HTTP {exc.status_code})"
            if isinstance(exc, GeminiProviderError) and exc.status_code is not None
            else ""
        )
        print(f"Gemini smoke check failed: {category}{status}.")
        return 1
    finally:
        if client is not None:
            client.close()

    print(
        "Gemini smoke check passed: "
        f"model={result.model}, quality_guard=passed, "
        f"input_tokens={result.input_tokens}, output_tokens={result.output_tokens}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
