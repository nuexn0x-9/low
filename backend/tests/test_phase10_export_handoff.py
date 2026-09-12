import io
import zipfile
import pytest
from httpx import AsyncClient
from app.services.agent_service import AGENT_SCHEMA, apply_action


@pytest.mark.asyncio
async def test_tokens_export_endpoints(client: AsyncClient, auth_headers: dict):
    # 1. Create a project
    create_resp = await client.post(
        "/api/projects",
        json={"name": "Phase 10 Export Project"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    proj_id = create_resp.json()["id"]

    # 2. Export tokens.json
    tokens_json_resp = await client.get(
        f"/api/projects/{proj_id}/export/tokens.json",
        headers=auth_headers,
    )
    assert tokens_json_resp.status_code == 200
    tokens_data = tokens_json_resp.json()
    assert "designTokens" in tokens_data
    design_tokens = tokens_data["designTokens"]
    assert "colors" in design_tokens
    assert "spacing" in design_tokens
    assert "radius" in design_tokens

    # 3. Export tokens.css
    tokens_css_resp = await client.get(
        f"/api/projects/{proj_id}/export/tokens.css",
        headers=auth_headers,
    )
    assert tokens_css_resp.status_code == 200
    assert "text/css" in tokens_css_resp.headers["content-type"]
    css_text = tokens_css_resp.text
    assert ":root {" in css_text
    assert "--low-color-" in css_text
    assert "--low-spacing-" in css_text


@pytest.mark.asyncio
async def test_prototype_zip_export(client: AsyncClient, auth_headers: dict):
    # 1. Create project
    create_resp = await client.post(
        "/api/projects",
        json={"name": "Prototype Zip Project"},
        headers=auth_headers,
    )
    assert create_resp.status_code == 201
    proj_id = create_resp.json()["id"]

    # 2. Request prototype.zip
    zip_resp = await client.get(
        f"/api/projects/{proj_id}/export/prototype.zip",
        headers=auth_headers,
    )
    assert zip_resp.status_code == 200
    assert zip_resp.headers["content-type"] == "application/zip"

    # Verify zip content
    zip_bytes = io.BytesIO(zip_resp.content)
    with zipfile.ZipFile(zip_bytes, "r") as zf:
        file_list = zf.namelist()
        assert "index.html" in file_list
        assert "low-prototype.json" in file_list
        assert "README.txt" in file_list
        html_content = zf.read("index.html").decode("utf-8")
        assert "LOW Standalone Mobile Prototype Viewer" in html_content


@pytest.mark.asyncio
async def test_render_preview_endpoints(client: AsyncClient):
    # Render frame preview
    frame_payload = {
        "frame": {
            "id": "screen_1",
            "name": "Home Screen",
            "width": 390,
            "height": 844,
            "nodes": [
                {"id": "n1", "type": "rectangle", "x": 10, "y": 20, "width": 100, "height": 40},
                {"id": "n2", "type": "text", "x": 10, "y": 80, "width": 200, "height": 20, "hidden": True},
            ],
        }
    }
    frame_resp = await client.post("/api/export/render/frame", json=frame_payload)
    assert frame_resp.status_code == 200
    frame_data = frame_resp.json()
    assert frame_data["frameId"] == "screen_1"
    assert frame_data["visibleNodesCount"] == 1

    # Render selection preview
    selection_payload = {
        "nodes": [
            {"id": "n1", "x": 20, "y": 30, "width": 80, "height": 40},
            {"id": "n2", "x": 50, "y": 100, "width": 100, "height": 50},
        ]
    }
    sel_resp = await client.post("/api/export/render/selection", json=selection_payload)
    assert sel_resp.status_code == 200
    sel_data = sel_resp.json()
    assert sel_data["count"] == 2
    assert sel_data["bounds"]["x"] == 20
    assert sel_data["bounds"]["y"] == 30
    assert sel_data["bounds"]["width"] == 130
    assert sel_data["bounds"]["height"] == 120


def test_agent_phase10_export_actions():
    assert AGENT_SCHEMA["version"] == "2.4.0"

    doc = [
        {
            "id": "s1",
            "name": "Screen One",
            "width": 390,
            "height": 844,
            "nodes": [
                {
                    "id": "node_btn",
                    "type": "button",
                    "name": "Submit Button",
                    "x": 24,
                    "y": 100,
                    "width": 342,
                    "height": 48,
                    "style": {
                        "fill": "#18181b",
                        "stroke": "#000000",
                        "strokeWidth": 1,
                        "radius": 8,
                        "color": "#ffffff",
                        "fontSize": 16,
                        "fontWeight": 600,
                    },
                }
            ],
        }
    ]

    # 1. export_project_low_json
    res, d = apply_action(doc, "export_project_low_json", {})
    assert res["ok"] is True
    assert res["lowVersion"] == "1.0.0"
    assert len(res["document"]["frames"]) == 1

    # 2. export_design_tokens
    res, d = apply_action(doc, "export_design_tokens", {"tokens": {"colors": {"primary": "#18181b"}}})
    assert res["ok"] is True
    assert res["designTokens"]["colors"]["primary"] == "#18181b"

    # 3. export_frame_svg
    res, d = apply_action(doc, "export_frame_svg", {"screenId": "s1"})
    assert res["ok"] is True
    assert "<svg" in res["svg"]
    assert "</svg>" in res["svg"]

    # 4. get_inspect_data
    res, d = apply_action(doc, "get_inspect_data", {"screenId": "s1", "nodeId": "node_btn"})
    assert res["ok"] is True
    inspect_data = res["inspect"]
    assert inspect_data["id"] == "node_btn"
    assert inspect_data["layout"]["width"] == 342
    assert inspect_data["typography"]["fontSize"] == 16
    assert inspect_data["appearance"]["fill"] == "#18181b"

    # 5. get_node_css
    res, d = apply_action(doc, "get_node_css", {"screenId": "s1", "nodeId": "node_btn"})
    assert res["ok"] is True
    assert ".low-button {" in res["css"]
    assert "background: #18181b;" in res["css"]
    assert "border-radius: 8px;" in res["css"]

    # 6. get_prototype_package
    res, d = apply_action(doc, "get_prototype_package", {})
    assert res["ok"] is True
    assert res["package"]["format"] == "prototype.zip"
    assert res["package"]["screensCount"] == 1
    assert res["package"]["viewer"] == "index.html"
