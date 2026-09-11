import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_ai_import_settings(client: AsyncClient):
    resp = await client.get("/api/settings/ai-import")
    assert resp.status_code == 200
    data = resp.json()
    assert "provider" in data
    assert "model" in data
    assert "timeoutSeconds" in data
    assert "configured" in data
    # Ensure plaintext apiKey is NEVER in the response
    assert "apiKey" not in data
    assert "api_key" not in data


@pytest.mark.asyncio
async def test_update_ai_import_settings(client: AsyncClient):
    update_payload = {
        "provider": "openai_compatible",
        "model": "deepseek-chat",
        "timeoutSeconds": 45,
        "maxRetries": 3,
        "monochromeOutput": False,
        "apiKey": "sk-secret-test-key-12345"
    }
    resp = await client.put("/api/settings/ai-import", json=update_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["provider"] == "openai_compatible"
    assert data["model"] == "deepseek-chat"
    assert data["timeoutSeconds"] == 45
    assert data["maxRetries"] == 3
    assert data["monochromeOutput"] is False
    assert data["configured"] is True
    # Secret must not leak in response
    assert "apiKey" not in data
    assert "api_key" not in data
    assert "sk-secret-test-key-12345" not in resp.text

    # Re-fetch via GET to verify persistent state and zero leakage
    get_resp = await client.get("/api/settings/ai-import")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["provider"] == "openai_compatible"
    assert get_data["model"] == "deepseek-chat"
    assert get_data["configured"] is True
    assert "apiKey" not in get_data
    assert "sk-secret-test-key-12345" not in get_resp.text


@pytest.mark.asyncio
async def test_delete_ai_api_key(client: AsyncClient):
    del_resp = await client.delete("/api/settings/ai-import/api-key")
    assert del_resp.status_code == 200
    assert "cleared" in del_resp.json()["message"].lower()

    # If provider is still openai_compatible and no env key, configured should become False
    get_resp = await client.get("/api/settings/ai-import")
    assert get_resp.status_code == 200
    # Unless OPENAI_API_KEY is in env, configured is False for non-mock
    # Reset back to mock for subsequent tests
    await client.put("/api/settings/ai-import", json={"provider": "mock"})


@pytest.mark.asyncio
async def test_ai_test_connection_mock(client: AsyncClient):
    resp = await client.post("/api/settings/ai-import/test-connection", json={
        "provider": "mock",
        "model": "mock-canvas-gen"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["provider"] == "mock"
    assert data["latencyMs"] >= 0
    assert "successful" in data["message"].lower() or "ready" in data["message"].lower()


@pytest.mark.asyncio
async def test_get_and_update_agent_connect_settings(client: AsyncClient):
    # GET default
    get_resp = await client.get("/api/settings/agent-connect")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert "publicBaseUrl" in data
    assert "schemaEndpoint" in data
    assert "sessionsEndpoint" in data
    assert "defaultPreset" in data

    # PUT update
    update_payload = {
        "publicBaseUrl": "http://192.168.1.50:8000",
        "defaultPreset": "read_only",
        "defaultExpiryMinutes": 120,
        "requireDryRunFirst": True,
        "maxBatchOperations": 50,
        "instructionFormat": "claude"
    }
    put_resp = await client.put("/api/settings/agent-connect", json=update_payload)
    assert put_resp.status_code == 200
    put_data = put_resp.json()
    assert put_data["publicBaseUrl"] == "http://192.168.1.50:8000"
    assert put_data["defaultPreset"] == "read_only"
    assert put_data["defaultExpiryMinutes"] == 120
    assert put_data["requireDryRunFirst"] is True
    assert put_data["maxBatchOperations"] == 50
    assert put_data["instructionFormat"] == "claude"


@pytest.mark.asyncio
async def test_agent_connect_test_endpoints(client: AsyncClient):
    resp = await client.post("/api/settings/agent-connect/test-endpoints", json={
        "publicBaseUrl": "http://localhost:8000",
        "schemaEndpoint": "/api/agent/schema"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "http://localhost:8000/api/agent/schema" in data["schemaUrl"]
