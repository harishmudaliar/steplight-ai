import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, Request, status
from backend.app.config import settings


class InMemoryRateLimiter:
    """
    Sliding window in-memory rate limiter for authentication endpoints.
    Tracks request timestamps per client identifier (IP address).
    """

    def __init__(self, requests_per_minute: int = 20):
        self.requests_per_minute = requests_per_minute
        self.history: Dict[str, List[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int = None, window_seconds: int = 60) -> None:
        """
        Check and record a request. Raises HTTPException(429) if exceeded.
        """
        limit = max_requests if max_requests is not None else self.requests_per_minute
        now = time.time()
        cutoff = now - window_seconds

        # Clean timestamps older than the sliding window
        valid_timestamps = [t for t in self.history[key] if t > cutoff]
        self.history[key] = valid_timestamps

        if len(valid_timestamps) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many attempts. Please take a gentle breath and try again shortly.",
                headers={"Retry-After": str(window_seconds)},
            )

        self.history[key].append(now)

    def clear(self) -> None:
        """Clear all rate limit state (useful in test teardown)."""
        self.history.clear()


auth_limiter = InMemoryRateLimiter(requests_per_minute=settings.AUTH_RATE_LIMIT_PER_MINUTE)


def rate_limit_auth(request: Request, max_requests: int = 15, window_seconds: int = 60):
    """
    FastAPI dependency for rate limiting authentication requests.
    Identifies clients by client host IP address or x-forwarded-for header.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    endpoint = request.url.path
    key = f"{client_ip}:{endpoint}"
    auth_limiter.check(key, max_requests=max_requests, window_seconds=window_seconds)
