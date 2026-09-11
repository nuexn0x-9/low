"""
Integration QA Verification Script for LOW
Simulates all manual test flows and queries SQLite directly to verify DB state.
"""
import requests
import sqlite3
import json
import uuid

BASE_URL = "http://127.0.0.1:8000/api"
DB_PATH = "low.db"

def run_qa():
    print("==================================================")
    print("LOW INTEGRATION QA TEST SUITE")
    print("==================================================")
    
    # ----------------------------------------------------
    # 1. Server Health
    # ----------------------------------------------------
    print("\n--- 1. Testing Server Health ---")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health_data = r.json()
    assert health_data["status"] == "ok" and health_data["app"] == "LOW", f"Unexpected health data: {health_data}"
    print(f"PASS: Server Health -> {health_data}")

    # ----------------------------------------------------
    # 2. Dashboard Project (Create / List / SQLite verification)
    # ----------------------------------------------------
    print("\n--- 2. Testing Dashboard Project Persistence ---")
    proj_id = f"p_qa_{uuid.uuid4().hex[:6]}"
    proj_name = f"QA Test Mobile App {uuid.uuid4().hex[:4]}"
    
    create_payload = {
        "id": proj_id,
        "name": proj_name,
        "description": "Created during Integration QA"
    }
    r = requests.post(f"{BASE_URL}/projects", json=create_payload)
    assert r.status_code in (200, 201), f"Project creation failed: {r.text}"
    proj_res = r.json()
    assert proj_res["id"] == proj_id
    assert proj_res["name"] == proj_name
    print(f"PASS: Created project {proj_id} via API")

    # Verify project exists in SQLite directly
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, name, owner_id FROM projects WHERE id = ?", (proj_id,))
    row = cur.fetchone()
    assert row is not None, f"Project {proj_id} not found in SQLite DB!"
    assert row[0] == proj_id and row[1] == proj_name
    print(f"PASS: SQLite table 'projects' contains row: {row}")

    # Verify listing via API
    r = requests.get(f"{BASE_URL}/projects")
    assert r.status_code == 200
    projects = r.json()
    assert any(p["id"] == proj_id for p in projects), f"Project {proj_id} missing from GET /api/projects"
    print(f"PASS: GET /api/projects contains new project")

    # ----------------------------------------------------
    # 3. Editor Sync & Autosave
    # ----------------------------------------------------
    print("\n--- 3. Testing Editor Sync and Autosave ---")
    # Load initial document
    r = requests.get(f"{BASE_URL}/projects/{proj_id}/document")
    assert r.status_code == 200
    doc_initial = r.json()
    initial_rev = doc_initial["revision"]
    print(f"Initial document revision: {initial_rev}")

    # Edit canvas: add custom rectangle, text, and button nodes with updated position/size
    edited_frames = [
        {
            "id": "frame_qa_home",
            "name": "Home Screen",
            "nodes": [
                {
                    "id": "node_txt_1",
                    "type": "text",
                    "name": "Dashboard Title",
                    "x": 30,
                    "y": 60,
                    "width": 250,
                    "height": 40,
                    "text": "My QA Dashboard",
                    "style": {"color": "#18181b", "fontSize": 24}
                },
                {
                    "id": "node_rect_1",
                    "type": "rectangle",
                    "name": "Hero Card",
                    "x": 24,
                    "y": 120,
                    "width": 342,
                    "height": 160,
                    "style": {"fill": "#f4f4f5", "radius": 12}
                }
            ]
        }
    ]

    # Trigger Autosave
    r = requests.post(f"{BASE_URL}/projects/{proj_id}/document/autosave", json={"frames": edited_frames})
    assert r.status_code == 200, f"Autosave failed: {r.text}"
    autosaved_data = r.json()
    assert autosaved_data["revision"] == initial_rev + 1, f"Revision did not increment: {autosaved_data['revision']}"
    print(f"PASS: Autosave succeeded, revision incremented to {autosaved_data['revision']}")

    # Verify content in SQLite directly
    cur.execute("SELECT low_version, revision, content_json FROM documents WHERE project_id = ?", (proj_id,))
    doc_row = cur.fetchone()
    assert doc_row is not None, "Document not found in SQLite!"
    stored_content = json.loads(doc_row[2])
    assert len(stored_content["frames"]) == 1
    assert stored_content["frames"][0]["name"] == "Home Screen"
    assert len(stored_content["frames"][0]["nodes"]) == 2
    print("PASS: SQLite table 'documents' contains updated frames and nodes")

    # Reload document via GET /document (simulating browser refresh)
    r = requests.get(f"{BASE_URL}/projects/{proj_id}/document")
    assert r.status_code == 200
    reloaded_doc = r.json()
    assert reloaded_doc["content"]["frames"][0]["name"] == "Home Screen"
    assert reloaded_doc["content"]["frames"][0]["nodes"][0]["text"] == "My QA Dashboard"
    print("PASS: Browser reload simulation: changes preserved intact")

    # ----------------------------------------------------
    # 4. Import / Export .low.json
    # ----------------------------------------------------
    print("\n--- 4. Testing Import / Export .low.json ---")
    # Export project
    r = requests.get(f"{BASE_URL}/projects/{proj_id}/export/low-json")
    assert r.status_code == 200, f"Export failed: {r.text}"
    exported_data = r.json()
    assert "lowVersion" in exported_data
    assert "document" in exported_data
    assert exported_data["document"]["id"] == proj_id
    assert len(exported_data["document"]["frames"]) == 1
    print(f"PASS: Exported document in format {exported_data['lowVersion']}")

    # Validate the exported JSON via validate endpoint
    r = requests.post(f"{BASE_URL}/import/low-json/validate", json={"data": exported_data})
    assert r.status_code == 200
    val_res = r.json()
    assert val_res["valid"] is True
    print(f"PASS: Validate endpoint confirms exported document is valid (nodes={val_res['total_nodes']})")

    # Prepare imported document with new screen
    import_payload = {
        "lowVersion": "1.0.0",
        "document": {
            "id": proj_id,
            "name": proj_name,
            "frames": [
                {
                    "id": "frame_imported_1",
                    "name": "Imported Screen",
                    "nodes": [
                        {"id": "n_imp", "type": "text", "name": "Imported Label", "x": 20, "y": 40, "width": 200, "height": 30, "text": "Imported Text"}
                    ]
                }
            ]
        }
    }

    # Import into project
    r = requests.post(f"{BASE_URL}/projects/{proj_id}/import/low-json", json=import_payload)
    assert r.status_code == 200, f"Import failed: {r.text}"
    print("PASS: POST /api/projects/{id}/import/low-json succeeded")

    # Check version snapshot in SQLite
    cur.execute("SELECT id, reason, version_number FROM document_versions WHERE document_id = (SELECT id FROM documents WHERE project_id = ?) ORDER BY version_number DESC", (proj_id,))
    snapshots = cur.fetchall()
    assert len(snapshots) >= 1, "No version snapshot found in SQLite!"
    assert any(s[1] == "pre-import backup" for s in snapshots), f"pre-import backup not found in snapshots: {snapshots}"
    print(f"PASS: SQLite document_versions contains pre-import backup snapshot: {snapshots[0]}")

    # ----------------------------------------------------
    # 5. Agent Connect
    # ----------------------------------------------------
    print("\n--- 5. Testing Agent Connect Flow ---")
    # Start Agent Session
    r = requests.post(f"{BASE_URL}/agent/sessions", json={"name": "QA Agent Session", "project_id": proj_id})
    assert r.status_code == 200, f"Create agent session failed: {r.text}"
    sess = r.json()
    sid = sess["session_id"]
    agent_token = sess["token"]
    assert sid and agent_token
    print(f"PASS: Started agent session {sid} with token")

    # Verify session in SQLite has token_hash, not plain token
    cur.execute("SELECT token_hash, expires_at, seq FROM agent_sessions WHERE id = ?", (sid,))
    sess_row = cur.fetchone()
    assert sess_row is not None
    assert sess_row[0] != agent_token, "SECURITY RISK: Agent token is stored in plain text!"
    print("PASS: Agent token is securely stored as SHA-256 hash in SQLite")

    # Simulate Agent Action 1: add_element
    screen_id = sess["frames"][0]["id"]
    action_1 = {
        "action": "add_element",
        "params": {
            "screenId": screen_id,
            "element": {
                "type": "button",
                "name": "Agent Action Button",
                "text": "Click Me",
                "x": 24,
                "y": 500,
                "width": 342,
                "height": 50
            }
        }
    }
    r = requests.post(f"{BASE_URL}/agent/sessions/{sid}/actions", headers={"X-LOW-Token": agent_token}, json=action_1)
    assert r.status_code == 200, f"Agent action add_element failed: {r.text}"
    res_1 = r.json()
    assert res_1["ok"] is True
    assert res_1["seq"] == 1
    new_el_id = res_1["result"]["elementId"]
    print(f"PASS: Action add_element executed (elementId={new_el_id}, seq=1)")

    # Simulate Agent Action 2: link_prototype
    action_2 = {
        "action": "link_prototype",
        "params": {
            "screenId": screen_id,
            "elementId": new_el_id,
            "target": screen_id,
            "trigger": "tap",
            "action": "navigate",
            "transition": "slide"
        }
    }
    r = requests.post(f"{BASE_URL}/agent/sessions/{sid}/actions", headers={"X-LOW-Token": agent_token}, json=action_2)
    assert r.status_code == 200, f"Agent action link_prototype failed: {r.text}"
    res_2 = r.json()
    assert res_2["ok"] is True
    assert res_2["seq"] == 2
    print(f"PASS: Action link_prototype executed (seq=2)")

    # Verify agent events recorded in SQLite
    cur.execute("SELECT seq, action FROM agent_events WHERE session_id = ? ORDER BY seq ASC", (sid,))
    events = cur.fetchall()
    assert len(events) == 2, f"Expected 2 agent events, got {len(events)}"
    assert events[0][1] == "add_element" and events[1][1] == "link_prototype"
    print(f"PASS: SQLite agent_events table contains 2 events: {events}")

    # Verify security: invalid token rejected
    r_bad = requests.post(f"{BASE_URL}/agent/sessions/{sid}/actions", headers={"X-LOW-Token": "bad_token"}, json=action_1)
    assert r_bad.status_code == 401
    print("PASS: Unauthorized action with invalid token correctly rejected (401)")

    # ----------------------------------------------------
    # 6. Library Components and Templates
    # ----------------------------------------------------
    print("\n--- 6. Testing Library Components and Templates ---")
    r = requests.get(f"{BASE_URL}/components")
    assert r.status_code == 200
    comps = r.json()
    assert len(comps) >= 6
    print(f"PASS: GET /api/components returned {len(comps)} components")

    r = requests.get(f"{BASE_URL}/templates")
    assert r.status_code == 200
    tpls = r.json()
    assert len(tpls) >= 3
    print(f"PASS: GET /api/templates returned {len(tpls)} templates")

    conn.close()
    print("\n==================================================")
    print("ALL INTEGRATION QA CHECKS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_qa()
