import os
import sys
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Explicitly locate root directory and root .env (2 levels up from backend/app)
ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT_DIR / ".env"

if ENV_FILE.exists():
    load_dotenv(dotenv_path=ENV_FILE)


class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "Steplight AI")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "true").strip().lower() in ("true", "1", "yes")

    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "18765"))
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")

    # Safe parsed list of CORS origins
    _cors_raw: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,app://steplight",
    )
    CORS_ORIGINS: List[str] = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]

    # Brand identity & product promise
    TAGLINE: str = "One Tiny Step. Zero Shame."

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./steplight.db")

    # Authentication & Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "059fe060b997e32de75e017f9eded81fc9630869bac346b54e7f3253348b04ca")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    RESET_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "15"))
    PASSWORD_HASH_ALGORITHM: str = os.getenv("PASSWORD_HASH_ALGORITHM", "argon2")

    # Task Limits & Defaults
    DEFAULT_CAPACITY: str = os.getenv("DEFAULT_CAPACITY", "medium")
    MAX_TASK_LENGTH: int = int(os.getenv("MAX_TASK_LENGTH", "2000"))
    MAX_STEP_LENGTH: int = int(os.getenv("MAX_STEP_LENGTH", "300"))

    # Local, versioned strategy retrieval. Raw task text is query-only and never indexed.
    STRATEGY_KB_PATH: Path = Path(
        os.getenv("STRATEGY_KB_PATH", str(ROOT_DIR / "backend" / "knowledge_base" / "strategies.v1.json"))
    )
    STRATEGY_INDEX_DIR: Path = Path(
        os.getenv("STRATEGY_INDEX_DIR", str(ROOT_DIR / "backend" / "data" / "strategy-index-v1"))
    )
    STRATEGY_RETRIEVAL_TOP_K: int = int(os.getenv("STRATEGY_RETRIEVAL_TOP_K", "3"))
    STRATEGY_MIN_RELEVANCE_SCORE: float = float(os.getenv("STRATEGY_MIN_RELEVANCE_SCORE", "0.28"))

    # Gemini is only used after explicit per-user consent and remains backend-only.
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    GEMINI_TIMEOUT_SECONDS: float = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "60"))
    GEMINI_MAX_RETRIES: int = int(os.getenv("GEMINI_MAX_RETRIES", "1"))
    GEMINI_INPUT_COST_PER_MILLION: float | None = (
        float(os.environ["GEMINI_INPUT_COST_PER_MILLION"])
        if os.getenv("GEMINI_INPUT_COST_PER_MILLION")
        else None
    )
    GEMINI_OUTPUT_COST_PER_MILLION: float | None = (
        float(os.environ["GEMINI_OUTPUT_COST_PER_MILLION"])
        if os.getenv("GEMINI_OUTPUT_COST_PER_MILLION")
        else None
    )

    # Rate limiting (requests per minute)
    AUTH_RATE_LIMIT_PER_MINUTE: int = int(os.getenv("AUTH_RATE_LIMIT_PER_MINUTE", "20"))

    # Dev Email Sink directory
    DEV_EMAIL_SINK_FILE: Path = ROOT_DIR / "backend" / "dev_email_sink.log"

    def validate_security(self) -> None:
        """
        Fail closed: In non-development mode, enforce strong cryptographically secure JWT secrets.
        """
        is_dev = self.APP_ENV.lower() in ("development", "test", "dev")
        insecure_patterns = [
            "",
            "REPLACE_WITH_A_SECURE_RANDOM_SECRET",
            "CHANGE_TO_A_SECURE_RANDOM_SECRET_FOR_PRODUCTION",
            "secret",
            "changeme",
        ]
        
        if not is_dev:
            if not self.JWT_SECRET_KEY or self.JWT_SECRET_KEY in insecure_patterns or len(self.JWT_SECRET_KEY) < 32:
                raise RuntimeError(
                    f"CRITICAL SECURITY CONFIGURATION ERROR: APP_ENV is '{self.APP_ENV}', "
                    "but JWT_SECRET_KEY is missing, insecure, or less than 32 characters. "
                    "Steplight AI is failing closed to prevent credential compromise."
                )
            if not self.DATABASE_URL.lower().startswith(
                ("postgres://", "postgresql://", "postgresql+psycopg://")
            ):
                raise RuntimeError(
                    "CRITICAL DATABASE CONFIGURATION ERROR: production deployments must use "
                    "a PostgreSQL DATABASE_URL."
                )

    def database_url(self) -> str:
        """Normalize hosted PostgreSQL URLs to the installed psycopg 3 driver."""
        if self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
        if self.DATABASE_URL.startswith("postgresql://"):
            return self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.DATABASE_URL


settings = Settings()
