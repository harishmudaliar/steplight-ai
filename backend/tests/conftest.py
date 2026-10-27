import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.core.rate_limit import auth_limiter
from backend.app.core.email_sink import clear_dev_email_sink

@pytest.fixture(scope="session", autouse=True)
def setup_test_db(tmp_path_factory):
    """Create test tables in a temporary database without touching workspace data."""
    database_path = tmp_path_factory.mktemp("steplight-tests") / "test.sqlite"
    test_engine = create_engine(
        f"sqlite:///{database_path.as_posix()}",
        connect_args={"check_same_thread": False},
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield testing_session_local
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


@pytest.fixture(autouse=True)
def clean_state():
    """Clear rate limits and email sink between test runs."""
    auth_limiter.clear()
    clear_dev_email_sink()
    yield


@pytest.fixture
def db_session(setup_test_db):
    """Yield an isolated test session."""
    session = setup_test_db()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """Yield a TestClient wired to the test database session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
