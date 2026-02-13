import sys
import os
import pytest
from starlette.testclient import TestClient

# Add the parent directory to sys.path to allow imports from backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

@pytest.fixture
def client():
    return TestClient(app)
