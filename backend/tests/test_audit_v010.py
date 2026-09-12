import io
import json
import zipfile
import glob
import os
import pytest
from httpx import AsyncClient
from app.services.import_service import validate_and_normalize_low_data


@pytest.mark.asyncio
async def test_all_sample_projects_round_trip(client: AsyncClient, auth_headers: dict):
    """
    Test that all sample projects in examples/*.low.json:
    1. Pass validate_and_normalize_low_data without errors.
    2. Can be imported into a project via /api/projects/{id}/import/low-json.
    3. Can be exported via /api/projects/{id}/export/low-json.
    4. Exported output can be re-validated and re-imported cleanly.
    """
    example_files = glob.glob("examples/*.low.json")
    assert len(example_files) >= 4, f"Expected at least 4 sample files, found {len(example_files)}"

    for file_path in example_files:
        with open(file_path, "r", encoding="utf-8") as f:
            raw_content = f.read()

        sample_json = json.loads(raw_content)

        # 1. Direct validation check
        valid, version, frames, errors, warnings = validate_and_normalize_low_data(sample_json)
        assert valid is True, f"Sample file {file_path} failed validation: {errors}"
        assert len(frames) > 0, f"Sample file {file_path} has no frames"

        # 2. Create project to import into
        base_name = os.path.basename(file_path).replace(".low.json", "")
        create_resp = await client.post(
            "/api/projects",
            json={"name": f"Audit {base_name}"},
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        proj_id = create_resp.json()["id"]

        # 3. Import into project
        import_resp = await client.post(
            f"/api/projects/{proj_id}/import/low-json",
            json=sample_json,
            headers=auth_headers,
        )
        assert import_resp.status_code == 200
        assert import_resp.json()["status"] == "ok"

        # 4. Export project
        export_resp = await client.get(
            f"/api/projects/{proj_id}/export/low-json",
            headers=auth_headers,
        )
        assert export_resp.status_code == 200
        exported_data = export_resp.json()

        # 5. Re-validate exported data
        re_valid, re_version, re_frames, re_errors, _ = validate_and_normalize_low_data(exported_data)
        assert re_valid is True, f"Re-validation failed for {file_path}: {re_errors}"
        assert len(re_frames) == len(frames)


@pytest.mark.asyncio
async def test_soft_deleted_project_access_rejected(client: AsyncClient, auth_headers: dict):
    """
    Ensure all endpoints return 404 when accessing a soft-deleted project.
    """
    # 1. Create a project
    create_resp = await client.post(
        "/api/projects",
        json={"name": "Project to Delete"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    proj_id = create_resp.json()["id"]

    # 2. Soft delete it
    del_resp = await client.delete(f"/api/projects/{proj_id}", headers=auth_headers)
    assert del_resp.status_code == 200

    # 3. Verify get_project returns 404
    assert (await client.get(f"/api/projects/{proj_id}", headers=auth_headers)).status_code == 404

    # 4. Verify get_document returns 404 (and does NOT resurrect it!)
    assert (await client.get(f"/api/projects/{proj_id}/document", headers=auth_headers)).status_code == 404

    # 5. Verify thumbnail returns 404
    assert (await client.get(f"/api/projects/{proj_id}/thumbnail", headers=auth_headers)).status_code == 404

    # 6. Verify design-tokens endpoints return 404
    assert (await client.get(f"/api/projects/{proj_id}/design-tokens", headers=auth_headers)).status_code == 404
    assert (
        await client.put(f"/api/projects/{proj_id}/design-tokens", json={"designTokens": {}}, headers=auth_headers)
    ).status_code == 404

    # 7. Verify export endpoints return 404
    assert (await client.get(f"/api/projects/{proj_id}/export/low-json", headers=auth_headers)).status_code == 404
    assert (await client.get(f"/api/projects/{proj_id}/export/tokens.json", headers=auth_headers)).status_code == 404
    assert (await client.get(f"/api/projects/{proj_id}/export/tokens.css", headers=auth_headers)).status_code == 404
    assert (await client.get(f"/api/projects/{proj_id}/export/prototype.zip", headers=auth_headers)).status_code == 404


@pytest.mark.asyncio
async def test_settings_never_leaks_raw_api_key(client: AsyncClient, auth_headers: dict):
    """
    Ensure AI settings store and mask sensitive API keys.
    """
    # Save key
    save_resp = await client.put(
        "/api/settings/ai-import",
        json={
            "provider": "openai_compatible",
            "model": "gpt-4o",
            "apiKey": "sk-proj-secret-key-1234567890abcdef",
        },
        headers=auth_headers,
    )
    assert save_resp.status_code == 200

    # Read back settings
    get_resp = await client.get("/api/settings/ai-import", headers=auth_headers)
    assert get_resp.status_code == 200
    data = get_resp.json()

    # Must be masked, not plain text
    assert "sk-proj-secret-key-1234567890abcdef" not in str(data)
    assert "apiKey" not in data
