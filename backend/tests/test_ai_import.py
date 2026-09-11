import pytest
import json
import httpx
from unittest.mock import AsyncMock, patch
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.config import settings
from app.services.ai.openai_provider import OpenAIAIProvider


@pytest.mark.asyncio
async def test_mock_generate_screen():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as cl:
        res = await cl.post("/api/ai/import/generate", json={
            "type": "screen",
            "prompt": "Buatkan halaman login fintech",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "draft"
        assert data["resultType"] == "screen"
        assert data["validation"]["valid"] is True
        assert data["draftId"] is not None
        assert data["provider"] == "mock"
        assert data["durationMs"] is not None
        assert data["tokenUsage"] is not None
        frames = data["documentPatch"]["frames"]
        assert len(frames) >= 1
        assert any(n["type"] == "input" for node in frames[0]["nodes"] for n in [node])


@pytest.mark.asyncio
async def test_mock_generate_component_and_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as cl:
        # Bottom nav
        res1 = await cl.post("/api/ai/import/generate", json={
            "type": "component",
            "prompt": "Buatkan bottom navigation menu",
        })
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["resultType"] == "component"
        assert any(n["type"] == "bottomnav" for n in data1["documentPatch"]["frames"][0]["nodes"])

        # Prototype Flow
        res2 = await cl.post("/api/ai/import/generate", json={
            "type": "prototype_flow",
            "prompt": "Flow login ke home dengan slide",
        })
        assert res2.status_code == 200
        data2 = res2.json()
        assert len(data2["documentPatch"]["frames"]) >= 2


@pytest.mark.asyncio
async def test_validate_output_and_safety_guards():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as cl:
        # 1. Valid patch
        valid_patch = {
            "frames": [
                {
                    "id": "f1",
                    "name": "Screen 1",
                    "nodes": [
                        {"id": "n1", "type": "button", "name": "Batton", "x": 10, "y": 10, "width": 100, "height": 40, "style": {}}
                    ],
                }
            ]
        }
        res = await cl.post("/api/ai/import/validate", json={
            "documentPatch": valid_patch,
        })
        assert res.status_code == 200
        assert res.json()["valid"] is True

        # 2. Invalid node type (e.g. iframe)
        invalid_patch = {
            "frames": [
                {
                    "id": "f1",
                    "name": "Screen 1",
                    "nodes": [
                        {"id": "n1", "type": "iframe", "name": "Iframe", "x": 10, "y": 10, "width": 100, "height": 40}
                    ],
                }
            ]
        }
        res_inv = await cl.post("/api/ai/import/validate", json={
            "documentPatch": invalid_patch,
        })
        assert res_inv.status_code == 200
        assert res_inv.json()["valid"] is False


@pytest.mark.asyncio
async def test_apply_ai_import_with_snapshot_and_revision():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as cl:
        pres = await cl.post("/api/projects", json={"name": "AI Import Test Project"})
        pid = pres.json()["id"]

        dres = await cl.get(f"/api/projects/{pid}/document")
        initial_rev = dres.json()["revision"]

        patch = {
            "frames": [
                {
                    "id": "ai_frame_1",
                    "name": "AI Generated Screen",
                    "nodes": [
                        {"id": "ai_n1", "type": "text", "name": "Heading", "x": 10, "y": 20, "width": 200, "height": 30, "style": {}}
                    ],
                }
            ]
        }

        apply_res = await cl.post(f"/api/projects/{pid}/ai/import/apply", json={
            "resultType": "screen",
            "documentPatch": patch,
            "expected_revision": initial_rev,
        })
        assert apply_res.status_code == 200
        apply_data = apply_res.json()
        assert apply_data["revision"] == initial_rev + 1

        vers_res = await cl.get(f"/api/projects/{pid}/document/versions")
        assert vers_res.status_code == 200
        versions = vers_res.json()
        assert any(v["reason"] == "pre-ai-import" for v in versions)

        conflict_res = await cl.post(f"/api/projects/{pid}/ai/import/apply", json={
            "resultType": "screen",
            "documentPatch": patch,
            "expected_revision": 999,
        })
        assert conflict_res.status_code == 409


@pytest.mark.asyncio
async def test_ai_providers_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as cl:
        res = await cl.get("/api/ai/import/providers")
        assert res.status_code == 200
        data = res.json()
        assert "active_provider" in data
        assert isinstance(data["providers"], list)
        prov_names = [p["name"] for p in data["providers"]]
        assert "mock" in prov_names
        assert "openai" in prov_names
        # Ensure API key is NEVER leaked in provider info
        raw_text = res.text
        assert "sk-" not in raw_text


@pytest.mark.asyncio
async def test_ai_draft_history_and_apply_by_draft_id():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as cl:
        # 1. Create project
        pres = await cl.post("/api/projects", json={"name": "History Draft Project"})
        pid = pres.json()["id"]

        # 2. Generate screen associated with project
        gres = await cl.post("/api/ai/import/generate", json={
            "type": "screen",
            "prompt": "Fintech Dashboard",
            "projectId": pid,
        })
        assert gres.status_code == 200
        gdata = gres.json()
        draft_id = gdata["draftId"]
        assert draft_id is not None
        assert gdata["durationMs"] is not None

        # 3. Check history endpoint
        hres = await cl.get(f"/api/ai/import/history?project_id={pid}")
        assert hres.status_code == 200
        hlist = hres.json()
        assert len(hlist) >= 1
        assert any(d["id"] == draft_id for d in hlist)

        # 4. Get draft by id
        dres = await cl.get(f"/api/ai/import/history/{draft_id}")
        assert dres.status_code == 200
        detail = dres.json()
        assert detail["id"] == draft_id
        assert detail["prompt"] == "Fintech Dashboard"
        assert "draft_json" in detail
        assert "validation_json" in detail

        # 5. Apply draft by id
        doc_res = await cl.get(f"/api/projects/{pid}/document")
        cur_rev = doc_res.json()["revision"]

        ares = await cl.post(f"/api/ai/import/history/{draft_id}/apply", json={
            "expected_revision": cur_rev
        })
        assert ares.status_code == 200
        adata = ares.json()
        assert adata["status"] == "success"
        assert adata["revision"] == cur_rev + 1

        # Check status is now 'applied'
        dres2 = await cl.get(f"/api/ai/import/history/{draft_id}")
        assert dres2.json()["status"] == "applied"
        assert dres2.json()["applied_at"] is not None


@pytest.mark.asyncio
async def test_ai_draft_regenerate():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as cl:
        pres = await cl.post("/api/projects", json={"name": "Regenerate Test"})
        pid = pres.json()["id"]

        gres = await cl.post("/api/ai/import/generate", json={
            "type": "component",
            "prompt": "Bottom navigation",
            "projectId": pid,
        })
        draft_id = gres.json()["draftId"]

        # Regenerate by id
        reg_res = await cl.post(f"/api/ai/import/history/{draft_id}/regenerate")
        assert reg_res.status_code == 200
        reg_data = reg_res.json()
        assert reg_data["draftId"] != draft_id
        assert reg_data["resultType"] == "component"


@pytest.mark.asyncio
async def test_openai_provider_missing_key():
    prov = OpenAIAIProvider()
    with patch.object(settings, "OPENAI_API_KEY", ""):
        with pytest.raises(ValueError) as exc:
            await prov.generate_low_patch("login", "screen")
        assert "OPENAI_API_KEY is not configured" in str(exc.value)


@pytest.mark.asyncio
async def test_openai_provider_timeout_and_error_sanitization():
    prov = OpenAIAIProvider()
    fake_key = "sk-secret-12345-very-secret"
    with patch.object(settings, "OPENAI_API_KEY", fake_key), \
         patch.object(settings, "AI_MAX_RETRIES", 0):

        # Test timeout handling
        with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Read timed out")):
            with pytest.raises(ValueError) as exc:
                await prov.generate_low_patch("login", "screen")
            assert "timed out" in str(exc.value)

        # Test 401 unauthorized
        mock_401 = AsyncMock()
        mock_401.status_code = 401
        with patch("httpx.AsyncClient.post", return_value=mock_401):
            with pytest.raises(ValueError) as exc:
                await prov.generate_low_patch("login", "screen")
            assert "invalid or unauthorized" in str(exc.value)

        # Test sanitization: API key must NEVER leak in exception message
        mock_err = AsyncMock()
        mock_err.status_code = 400
        mock_err.content = b'{"error": {"message": "Invalid key ' + fake_key.encode() + b'"}}'
        mock_err.json.return_value = {"error": {"message": f"Invalid key {fake_key}"}}
        with patch("httpx.AsyncClient.post", return_value=mock_err):
            with pytest.raises(ValueError) as exc:
                await prov.generate_low_patch("login", "screen")
            msg = str(exc.value)
            assert fake_key not in msg
            assert "[REDACTED]" in msg
