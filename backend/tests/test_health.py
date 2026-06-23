"""
Health Endpoint Tests
======================
Basic tests for the /health endpoint.
"""

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test that the health endpoint returns a healthy status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "AETHER-Med"
        assert "version" in data
        assert "timestamp" in data
