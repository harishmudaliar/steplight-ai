"""Check configured Gemini model access without displaying credentials."""

import sys

from backend.app.config import settings
from backend.app.core.gemini_sequencer import GeminiClient, GeminiProviderError


def main() -> int:
    if not settings.GEMINI_API_KEY:
        print("Gemini model check failed: GEMINI_API_KEY is not configured.")
        return 1

    client = None
    try:
        client = GeminiClient()
        model = client.validate_model_available()
    except (GeminiProviderError, ValueError) as exc:
        category = exc.category if isinstance(exc, GeminiProviderError) else "configuration"
        print(f"Gemini model check failed: {category}.")
        return 1
    finally:
        if client is not None:
            client.close()

    print(f"Gemini model is available: {model['name']} ({model['display_name']}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
