import pytest
from backend.app.config import Settings


def test_fail_closed_in_production_with_insecure_key():
    config = Settings()
    config.APP_ENV = "production"
    config.JWT_SECRET_KEY = "REPLACE_WITH_A_SECURE_RANDOM_SECRET"

    with pytest.raises(RuntimeError) as exc_info:
        config.validate_security()

    assert "FAIL CLOSED" in str(exc_info.value) or "CRITICAL SECURITY" in str(exc_info.value)


def test_fail_closed_in_production_with_short_key():
    config = Settings()
    config.APP_ENV = "production"
    config.JWT_SECRET_KEY = "short_insecure_key"

    with pytest.raises(RuntimeError) as exc_info:
        config.validate_security()

    assert "less than 32 characters" in str(exc_info.value)


def test_secure_key_passes_validation_in_production():
    config = Settings()
    config.APP_ENV = "production"
    config.JWT_SECRET_KEY = "a_very_long_secure_cryptographic_key_exceeding_32_characters"
    config.DATABASE_URL = "postgresql://user:password@example.test:5432/steplight"

    # Must pass without raising
    config.validate_security()


def test_production_rejects_sqlite_and_normalizes_postgresql_driver_url():
    config = Settings()
    config.APP_ENV = "production"
    config.JWT_SECRET_KEY = "a_very_long_secure_cryptographic_key_exceeding_32_characters"
    with pytest.raises(RuntimeError, match="PostgreSQL DATABASE_URL"):
        config.validate_security()

    config.DATABASE_URL = "mysql://user:password@example.test/steplight"
    with pytest.raises(RuntimeError, match="PostgreSQL DATABASE_URL"):
        config.validate_security()

    config.DATABASE_URL = "postgresql://user:password@example.test:5432/steplight"
    assert config.database_url().startswith("postgresql+psycopg://")
    config.DATABASE_URL = "postgres://user:password@example.test:5432/steplight"
    assert config.database_url().startswith("postgresql+psycopg://")


def test_development_mode_allowed():
    config = Settings()
    config.APP_ENV = "development"
    # Development mode allows local setup
    config.validate_security()
