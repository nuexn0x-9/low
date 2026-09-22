import copy
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException
from app.core.config import settings
from app.core.security import generate_agent_token, hash_agent_token
from app.models.agent import AgentSession, AgentEvent
from app.models.ai_draft import AIImportDraft
from app.models.base import utc_now
from app.services.ai import get_ai_provider, validate_and_guard_ai_patch


ALL_SCOPES = [
    "read_document",
    "write_document",
    "create_screen",
    "edit_screen",
    "delete_screen",
    "manage_components",
    "manage_templates",
    "run_ai_import",
    "apply_ai_import",
    "batch_update",
    "dry_run",
    "undo_changes",
]

PRESET_SCOPES = {
    "read_only": ["read_document"],
    "design_assistant": [
        "read_document",
        "write_document",
        "create_screen",
        "edit_screen",
        "delete_screen",
        "manage_components",
        "dry_run",
    ],
    "prototype_assistant": [
        "read_document",
        "write_document",
        "edit_screen",
        "dry_run",
    ],
    "ai_import_assistant": [
        "read_document",
        "write_document",
        "create_screen",
        "run_ai_import",
        "apply_ai_import",
        "dry_run",
    ],
    "full_editor_assistant": ALL_SCOPES,
}

ACTION_SCOPES = {
    "get_document": ["read_document"],
    "list_screens": ["read_document"],
    "create_screen": ["create_screen", "write_document"],
    "rename_screen": ["edit_screen", "write_document"],
    "delete_screen": ["delete_screen", "write_document"],
    "add_element": ["edit_screen", "write_document"],
    "update_element": ["edit_screen", "write_document"],
    "move_element": ["edit_screen", "write_document"],
    "resize_element": ["edit_screen", "write_document"],
    "duplicate_element": ["edit_screen", "write_document"],
    "duplicate_screen": ["create_screen", "write_document"],
    "delete_element": ["edit_screen", "write_document"],
    "link_prototype": ["edit_screen", "write_document"],
    "create_component": ["manage_components", "write_document"],
    "update_component": ["manage_components", "write_document"],
    "save_template": ["manage_templates", "write_document"],
    "apply_ai_import": ["apply_ai_import", "write_document"],
    "apply_ai_draft": ["apply_ai_import", "write_document"],
    "create_ai_draft": ["run_ai_import"],
    "batch_update": ["batch_update", "write_document"],
    "undo_last_agent_change": ["undo_changes"],
    "group_elements": ["edit_screen", "write_document"],
    "ungroup_element": ["edit_screen", "write_document"],
    "align_elements": ["edit_screen", "write_document"],
    "distribute_elements": ["edit_screen", "write_document"],
    "set_layer_visibility": ["edit_screen", "write_document"],
    "set_layer_lock": ["edit_screen", "write_document"],
    "reorder_layer": ["edit_screen", "write_document"],
    "create_component_from_selection": ["manage_components", "write_document"],
    "insert_component_instance": ["edit_screen", "write_document"],
    "detach_component_instance": ["edit_screen", "write_document"],
    "update_design_tokens": ["write_document"],
    "apply_style_preset": ["edit_screen", "write_document"],
    "update_text_content": ["edit_screen", "write_document"],
    "create_auto_layout_from_selection": ["edit_screen", "write_document"],
    "update_auto_layout": ["edit_screen", "write_document"],
    "insert_into_auto_layout": ["edit_screen", "write_document"],
    "remove_from_auto_layout": ["edit_screen", "write_document"],
    "reorder_auto_layout_child": ["edit_screen", "write_document"],
    "update_constraints": ["edit_screen", "write_document"],
    "update_frame_preset": ["edit_screen", "write_document"],
    "update_safe_area": ["edit_screen", "write_document"],
    "create_scroll_area": ["edit_screen", "write_document"],
    "export_project_low_json": ["read_document"],
    "export_design_tokens": ["read_document"],
    "export_frame_svg": ["read_document"],
    "get_inspect_data": ["read_document"],
    "get_node_css": ["read_document"],
    "get_prototype_package": ["read_document"],
}



def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _default_document() -> List[dict]:
    return [
        {
            "id": _new_id("frame"),
            "name": "Screen 1",
            "nodes": [
                {
                    "id": _new_id("node"),
                    "type": "text",
                    "name": "App Bar",
                    "x": 24,
                    "y": 52,
                    "width": 200,
                    "height": 28,
                    "text": "Screen 1",
                    "style": {"color": "#18181b", "fontSize": 20, "fontWeight": 700, "align": "left", "opacity": 100},
                }
            ],
        }
    ]


def _find_frame(doc: List[dict], sid: str) -> Optional[dict]:
    return next((f for f in doc if f.get("id") == sid), None)


def _normalize_element(el: dict) -> dict:
    el = el or {}
    etype = el.get("type", "rectangle")
    node = {
        "id": el.get("id") or _new_id("node"),
        "type": etype,
        "name": el.get("name") or etype.title(),
        "x": el.get("x", 24),
        "y": el.get("y", 24),
        "width": el.get("width", 200),
        "height": el.get("height", 48),
        "text": el.get("text", ""),
        "style": el.get("style", {}) or {},
    }
    if isinstance(el.get("prototype"), dict):
        node["prototype"] = el["prototype"]
    return node


ALLOWED_ACTIONS = set(ACTION_SCOPES.keys())


def _collect_descendant_ids(nodes: List[Dict[str, Any]], target_ids: List[str]) -> set:
    all_to_delete = set(target_ids)
    to_check = list(target_ids)
    while to_check:
        curr_id = to_check.pop()
        node = next((n for n in nodes if n.get("id") == curr_id), None)
        if node and isinstance(node.get("children"), list):
            for cid in node["children"]:
                if cid not in all_to_delete:
                    all_to_delete.add(cid)
                    to_check.append(cid)
        for n in nodes:
            if n.get("parentId") == curr_id and n.get("id") not in all_to_delete:
                all_to_delete.add(n.get("id"))
                to_check.append(n.get("id"))
    return all_to_delete


def _purge_nodes_and_clean_parents(nodes: List[Dict[str, Any]], target_ids: List[str]) -> List[Dict[str, Any]]:
    all_to_delete = _collect_descendant_ids(nodes, target_ids)
    cleaned = []
    for n in nodes:
        if n.get("id") in all_to_delete:
            continue
        if isinstance(n.get("children"), list):
            n["children"] = [cid for cid in n["children"] if cid not in all_to_delete]
        cleaned.append(n)
    return cleaned


def apply_action(doc: List[dict], action: str, params: Dict[str, Any]) -> Tuple[Any, List[dict]]:
    """Apply an agent action synchronously to the document. Returns (result, new_doc)."""
    if action not in ALLOWED_ACTIONS:
        raise ValueError(f"Action '{action}' is not in the allowed actions list")

    params = params or {}

    if action == "get_document":
        return {"frames": doc}, doc

    if action == "list_screens":
        return {"screens": [{"id": f["id"], "name": f["name"], "elements": len(f.get("nodes", []))} for f in doc]}, doc

    if action == "create_screen":
        name = params.get("name") or f"Screen {len(doc) + 1}"
        elements = params.get("elements") or []
        nodes = []
        for el in elements:
            nodes.append(_normalize_element(el))
        frame = {"id": _new_id("frame"), "name": name, "nodes": nodes}
        new_doc = doc + [frame]
        return {"screenId": frame["id"], "name": name}, new_doc

    if action == "rename_screen":
        sid = params.get("screenId")
        if not sid:
            raise ValueError("screenId is required")
        f = _find_frame(doc, sid)
        if not f:
            raise ValueError("screen not found")
        f["name"] = params.get("name", f["name"])
        return {"ok": True, "screenId": sid, "name": f["name"]}, doc

    if action == "delete_screen":
        sid = params.get("screenId")
        if not sid:
            raise ValueError("screenId is required")
        if len(doc) <= 1:
            raise ValueError("cannot delete the last screen")
        if not _find_frame(doc, sid):
            raise ValueError("screen not found")
        new_doc = [x for x in doc if x["id"] != sid]
        return {"ok": True, "deletedScreenId": sid}, new_doc

    if action == "duplicate_screen":
        sid = params.get("screenId")
        if not sid:
            raise ValueError("screenId is required")
        f = _find_frame(doc, sid)
        if not f:
            raise ValueError("screen not found")
        cloned_frame = copy.deepcopy(f)
        cloned_frame["id"] = _new_id("frame")
        cloned_frame["name"] = params.get("name") or f"{f.get('name', 'Screen')} Copy"
        # Regenerate node IDs and remap hierarchy
        id_map = {}
        for node in cloned_frame.get("nodes", []):
            old_id = node.get("id")
            new_id = _new_id("node")
            id_map[old_id] = new_id
            node["id"] = new_id

        for node in cloned_frame.get("nodes", []):
            if node.get("parentId") and node["parentId"] in id_map:
                node["parentId"] = id_map[node["parentId"]]
            if isinstance(node.get("children"), list):
                node["children"] = [id_map.get(cid, cid) for cid in node["children"]]

        new_doc = doc + [cloned_frame]
        return {"ok": True, "screenId": cloned_frame["id"], "name": cloned_frame["name"]}, new_doc

    if action == "add_element":
        sid = params.get("screenId")
        if not sid:
            raise ValueError("screenId is required")
        f = _find_frame(doc, sid)
        if not f:
            raise ValueError("screen not found")
        node = _normalize_element(params.get("element") or {})
        f.setdefault("nodes", []).append(node)
        return {"elementId": node["id"]}, doc

    if action == "update_element":
        sid = params.get("screenId")
        eid = params.get("elementId")
        if not sid or not eid:
            raise ValueError("screenId and elementId are required")
        f = _find_frame(doc, sid)
        if not f:
            raise ValueError("screen not found")
        el = next((n for n in f.get("nodes", []) if n["id"] == eid), None)
        if not el:
            raise ValueError("element not found")
        patch = params.get("patch", {}) or {}
        for k, v in patch.items():
            if k == "style" and isinstance(v, dict):
                el.setdefault("style", {}).update(v)
            elif k == "prototype" and isinstance(v, dict):
                el.setdefault("prototype", {}).update(v)
            else:
                el[k] = v
        return {"ok": True, "elementId": eid}, doc

    if action == "move_element":
        sid = params.get("screenId")
        eid = params.get("elementId")
        if not sid or not eid:
            raise ValueError("screenId and elementId are required")
        f = _find_frame(doc, sid)
        if not f:
            raise ValueError("screen not found")
        el = next((n for n in f.get("nodes", []) if n["id"] == eid), None)
        if not el:
            raise ValueError("element not found")
        if "x" in params:
            el["x"] = params["x"]
        if "y" in params:
            el["y"] = params["y"]
        return {"ok": True, "elementId": eid, "x": el.get("x"), "y": el.get("y")}, doc

    if action == "resize_element":
        sid = params.get("screenId")
        eid = params.get("elementId")
        if not sid or not eid:
            raise ValueError("screenId and elementId are required")
        f = _find_frame(doc, sid)
        if not f:
            raise ValueError("screen not found")
        el = next((n for n in f.get("nodes", []) if n["id"] == eid), None)
        if not el:
            raise ValueError("element not found")
        width = params.get("width")
        height = params.get("height")
        if width is None or height is None:
            raise ValueError("width and height are required")
        if float(width) < 0 or float(height) < 0:
            raise ValueError("width and height must be non-negative")
        el["width"] = float(width)
        el["height"] = float(height)
        return {"ok": True, "elementId": eid, "width": el["width"], "height": el["height"]}, doc

    if action == "duplicate_element":
        sid = params.get("screenId")
        eid = params.get("elementId")
        if not sid or not eid:
            raise ValueError("screenId and elementId are required")
        f = _find_frame(doc, sid)
        if not f:
            raise ValueError("screen not found")
        nodes = f.get("nodes", [])
        el = next((n for n in nodes if n["id"] == eid), None)
        if not el:
            raise ValueError("element not found")
        offset_x = params.get("offsetX", 20)
        offset_y = params.get("offsetY", 20)
        all_ids = _collect_descendant_ids(nodes, [eid])
        to_duplicate = [n for n in nodes if n.get("id") in all_ids]
        id_map = {n["id"]: _new_id("node") for n in to_duplicate}
        new_nodes = []
        for n in to_duplicate:
            cloned = copy.deepcopy(n)
            cloned["id"] = id_map[n["id"]]
            cloned["name"] = f"{n.get('name', 'Element')} Copy"
            cloned["x"] = float(n.get("x", 0)) + float(offset_x)
            cloned["y"] = float(n.get("y", 0)) + float(offset_y)
            if cloned.get("parentId") and cloned["parentId"] in id_map:
                cloned["parentId"] = id_map[cloned["parentId"]]
            else:
                cloned["parentId"] = None
            if isinstance(cloned.get("children"), list):
                cloned["children"] = [id_map.get(cid, cid) for cid in cloned["children"]]
            new_nodes.append(cloned)
        f.setdefault("nodes", []).extend(new_nodes)
        return {"ok": True, "elementId": id_map[eid], "name": f"{el.get('name', 'Element')} Copy"}, doc

    if action == "delete_element":
        sid = params.get("screenId")
        eid = params.get("elementId")
        if not sid or not eid:
            raise ValueError("screenId and elementId are required")
        f = _find_frame(doc, sid)
        if not f:
            raise ValueError("screen not found")
        f["nodes"] = _purge_nodes_and_clean_parents(f.get("nodes", []), [eid])
        return {"ok": True, "deletedElementId": eid}, doc

    if action == "link_prototype":
        sid = params.get("screenId")
        eid = params.get("elementId")
        if not sid or not eid:
            raise ValueError("screenId and elementId are required")
        f = _find_frame(doc, sid)
        if not f:
            raise ValueError("screen not found")
        el = next((n for n in f.get("nodes", []) if n["id"] == eid), None)
        if not el:
            raise ValueError("element not found")
        el["prototype"] = {
            "trigger": params.get("trigger", "tap"),
            "action": params.get("action", "navigate"),
            "target": params.get("target"),
            "transition": params.get("transition", "slide"),
        }
        return {"ok": True, "elementId": eid, "prototype": el["prototype"]}, doc

    if action == "create_component":
        name = params.get("name") or "New Component"
        node_raw = params.get("node") or {}
        comp_id = _new_id("comp")
        node = _normalize_element(node_raw)
        node["type"] = "component"
        node["name"] = name
        # If target screen provided, attach component there
        target_sid = params.get("screenId")
        if target_sid:
            f = _find_frame(doc, target_sid)
            if f:
                f.setdefault("nodes", []).append(node)
        return {"ok": True, "componentId": comp_id, "name": name, "element": node}, doc

    if action == "update_component":
        comp_id = params.get("componentId")
        patch = params.get("patch") or {}
        if not comp_id:
            raise ValueError("componentId is required")
        updated_count = 0
        for f in doc:
            for n in f.get("nodes", []):
                if n.get("id") == comp_id or n.get("name") == comp_id:
                    for k, v in patch.items():
                        if k == "style" and isinstance(v, dict):
                            n.setdefault("style", {}).update(v)
                        else:
                            n[k] = v
                    updated_count += 1
        return {"ok": True, "componentId": comp_id, "updatedCount": updated_count}, doc

    if action == "save_template":
        name = params.get("name") or "Saved Template"
        template_id = _new_id("tmpl")
        return {"ok": True, "templateId": template_id, "name": name}, doc

    if action == "apply_ai_import":
        patch = params.get("patch")
        if not patch or not isinstance(patch, dict):
            raise ValueError("patch object is required for apply_ai_import")
        valid, clean_patch, errors, warnings = validate_and_guard_ai_patch(patch)
        if not valid:
            raise ValueError(f"Invalid AI patch: {'; '.join(errors)}")

        new_frames = clean_patch.get("frames", [])
        if new_frames:
            doc = doc + new_frames
        return {"ok": True, "appliedFrames": len(new_frames)}, doc

    if action == "batch_update":
        operations = params.get("operations", [])
        if not isinstance(operations, list):
            raise ValueError("operations must be a list")
        if len(operations) == 0:
            raise ValueError("operations list cannot be empty")
        if len(operations) > 25:
            raise ValueError("Batch operations exceed maximum of 25")

        # Atomic dry execution first on temporary copy
        temp_doc = copy.deepcopy(doc)
        results = []
        for idx, op in enumerate(operations):
            if not isinstance(op, dict) or "action" not in op:
                raise ValueError(f"Operation at index {idx} must be an object with an 'action' property")
            sub_action = op["action"]
            sub_params = op.get("params", {})
            try:
                sub_res, temp_doc = apply_action(temp_doc, sub_action, sub_params)
                results.append({"action": sub_action, "result": sub_res})
            except Exception as e:
                raise ValueError(f"Batch failed at operation {idx} ({sub_action}): {str(e)}")

        return {"ok": True, "executed": len(operations), "results": results}, temp_doc

    if action == "group_elements":
        screen_id = params.get("screenId")
        node_ids = params.get("nodeIds", [])
        group_name = params.get("groupName") or "Group"
        if not screen_id:
            raise ValueError("screenId is required for group_elements")
        if not isinstance(node_ids, list) or len(node_ids) < 2:
            raise ValueError("nodeIds must contain at least 2 element IDs to group")

        target_frame = None
        for f in doc:
            if f.get("id") == screen_id:
                target_frame = f
                break
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        nodes = target_frame.get("nodes", [])
        matched_nodes = [n for n in nodes if n.get("id") in node_ids]
        if len(matched_nodes) != len(node_ids):
            raise ValueError("One or more nodeIds not found in screen")

        # Calculate bounding box
        min_x = min(n.get("x", 0) for n in matched_nodes)
        min_y = min(n.get("y", 0) for n in matched_nodes)
        max_r = max(n.get("x", 0) + n.get("width", 0) for n in matched_nodes)
        max_b = max(n.get("y", 0) + n.get("height", 0) for n in matched_nodes)

        group_id = _new_id("group")
        group_node = {
            "id": group_id,
            "type": "group",
            "name": group_name,
            "x": min_x,
            "y": min_y,
            "width": max(1, max_r - min_x),
            "height": max(1, max_b - min_y),
            "children": node_ids,
            "style": {},
        }
        for n in matched_nodes:
            n["parentId"] = group_id
        # Insert group node at position of first selected node
        first_idx = min(nodes.index(n) for n in matched_nodes)
        nodes.insert(first_idx, group_node)
        return {"ok": True, "groupId": group_id, "name": group_name, "children": node_ids}, doc

    if action == "ungroup_element":
        screen_id = params.get("screenId")
        group_id = params.get("groupId")
        if not screen_id or not group_id:
            raise ValueError("screenId and groupId are required for ungroup_element")

        target_frame = None
        for f in doc:
            if f.get("id") == screen_id:
                target_frame = f
                break
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        nodes = target_frame.get("nodes", [])
        group_node = next((n for n in nodes if n.get("id") == group_id and n.get("type") == "group"), None)
        if not group_node:
            raise ValueError(f"group '{group_id}' not found in screen")

        child_ids = set(group_node.get("children", []))
        for n in nodes:
            if n.get("parentId") == group_id or n.get("id") in child_ids:
                n["parentId"] = None

        nodes.remove(group_node)
        return {"ok": True, "ungroupedId": group_id, "children": group_node.get("children", [])}, doc

    if action == "align_elements":
        screen_id = params.get("screenId")
        node_ids = params.get("nodeIds", [])
        alignment = str(params.get("alignment", "left")).lower()
        if not screen_id or not node_ids:
            raise ValueError("screenId and nodeIds are required for align_elements")
        if alignment not in ("left", "center", "right", "top", "middle", "bottom"):
            raise ValueError(f"invalid alignment: {alignment}")

        target_frame = None
        for f in doc:
            if f.get("id") == screen_id:
                target_frame = f
                break
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        nodes = target_frame.get("nodes", [])
        matched = [n for n in nodes if n.get("id") in node_ids]
        if not matched:
            raise ValueError("No matching nodes found to align")

        if len(matched) == 1:
            # Align relative to mobile frame (390 x 844)
            n = matched[0]
            if alignment == "left": n["x"] = 0
            elif alignment == "center": n["x"] = round((390 - n.get("width", 0)) / 2)
            elif alignment == "right": n["x"] = round(390 - n.get("width", 0))
            elif alignment == "top": n["y"] = 0
            elif alignment == "middle": n["y"] = round((844 - n.get("height", 0)) / 2)
            elif alignment == "bottom": n["y"] = round(844 - n.get("height", 0))
        else:
            min_x = min(n.get("x", 0) for n in matched)
            max_r = max(n.get("x", 0) + n.get("width", 0) for n in matched)
            min_y = min(n.get("y", 0) for n in matched)
            max_b = max(n.get("y", 0) + n.get("height", 0) for n in matched)

            for n in matched:
                if alignment == "left": n["x"] = min_x
                elif alignment == "center": n["x"] = round(min_x + ((max_r - min_x) - n.get("width", 0)) / 2)
                elif alignment == "right": n["x"] = round(max_r - n.get("width", 0))
                elif alignment == "top": n["y"] = min_y
                elif alignment == "middle": n["y"] = round(min_y + ((max_b - min_y) - n.get("height", 0)) / 2)
                elif alignment == "bottom": n["y"] = round(max_b - n.get("height", 0))

        return {"ok": True, "alignedCount": len(matched), "alignment": alignment}, doc

    if action == "distribute_elements":
        screen_id = params.get("screenId")
        node_ids = params.get("nodeIds", [])
        axis = str(params.get("axis", "horizontal")).lower()
        if not screen_id or not node_ids or len(node_ids) < 3:
            raise ValueError("screenId and at least 3 nodeIds are required for distribute_elements")

        target_frame = None
        for f in doc:
            if f.get("id") == screen_id:
                target_frame = f
                break
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        nodes = target_frame.get("nodes", [])
        matched = [n for n in nodes if n.get("id") in node_ids]
        if len(matched) < 3:
            raise ValueError("At least 3 matched nodes required for distribution")

        if axis == "horizontal":
            matched.sort(key=lambda n: n.get("x", 0))
            first_x = matched[0].get("x", 0)
            last_n = matched[-1]
            last_r = last_n.get("x", 0) + last_n.get("width", 0)
            total_w = sum(n.get("width", 0) for n in matched)
            available_space = (last_r - first_x) - total_w
            spacing = available_space / (len(matched) - 1)
            curr_x = first_x
            for n in matched:
                n["x"] = round(curr_x)
                curr_x += n.get("width", 0) + spacing
        else:
            matched.sort(key=lambda n: n.get("y", 0))
            first_y = matched[0].get("y", 0)
            last_n = matched[-1]
            last_b = last_n.get("y", 0) + last_n.get("height", 0)
            total_h = sum(n.get("height", 0) for n in matched)
            available_space = (last_b - first_y) - total_h
            spacing = available_space / (len(matched) - 1)
            curr_y = first_y
            for n in matched:
                n["y"] = round(curr_y)
                curr_y += n.get("height", 0) + spacing

        return {"ok": True, "distributedCount": len(matched), "axis": axis}, doc

    if action == "set_layer_visibility":
        screen_id = params.get("screenId")
        node_id = params.get("nodeId")
        hidden = bool(params.get("hidden", True))
        if not screen_id or not node_id:
            raise ValueError("screenId and nodeId are required for set_layer_visibility")

        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        node = next((n for n in target_frame.get("nodes", []) if n.get("id") == node_id), None)
        if not node:
            raise ValueError(f"node '{node_id}' not found in screen")

        node["hidden"] = hidden
        return {"ok": True, "nodeId": node_id, "hidden": hidden}, doc

    if action == "set_layer_lock":
        screen_id = params.get("screenId")
        node_id = params.get("nodeId")
        locked = bool(params.get("locked", True))
        if not screen_id or not node_id:
            raise ValueError("screenId and nodeId are required for set_layer_lock")

        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        node = next((n for n in target_frame.get("nodes", []) if n.get("id") == node_id), None)
        if not node:
            raise ValueError(f"node '{node_id}' not found in screen")

        node["locked"] = locked
        return {"ok": True, "nodeId": node_id, "locked": locked}, doc

    if action == "reorder_layer":
        screen_id = params.get("screenId")
        node_id = params.get("nodeId")
        direction = str(params.get("direction", "forward")).lower()
        if not screen_id or not node_id:
            raise ValueError("screenId and nodeId are required for reorder_layer")
        if direction not in ("forward", "backward", "front", "back"):
            raise ValueError("direction must be 'forward', 'backward', 'front', or 'back'")

        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        nodes = target_frame.get("nodes", [])
        idx = next((i for i, n in enumerate(nodes) if n.get("id") == node_id), -1)
        if idx == -1:
            raise ValueError(f"node '{node_id}' not found in screen")

        node = nodes.pop(idx)
        if direction == "front":
            nodes.append(node)
        elif direction == "back":
            nodes.insert(0, node)
        elif direction == "forward":
            nodes.insert(min(len(nodes), idx + 1), node)
        elif direction == "backward":
            nodes.insert(max(0, idx - 1), node)

        return {"ok": True, "nodeId": node_id, "direction": direction}, doc

    if action == "create_component_from_selection":
        screen_id = params.get("screenId")
        node_ids = params.get("nodeIds", [])
        name = params.get("name") or "Component"
        category = params.get("category", "custom")
        if not screen_id or not node_ids:
            raise ValueError("screenId and nodeIds are required for create_component_from_selection")

        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        nodes = target_frame.get("nodes", [])
        matched = [n for n in nodes if n.get("id") in node_ids]
        if not matched:
            raise ValueError("No matching nodeIds found in screen")

        comp_id = _new_id("comp")
        cloned_nodes = [copy.deepcopy(n) for n in matched]
        min_x = min(n.get("x", 0) for n in matched)
        min_y = min(n.get("y", 0) for n in matched)
        max_r = max(n.get("x", 0) + n.get("width", 0) for n in matched)
        max_b = max(n.get("y", 0) + n.get("height", 0) for n in matched)

        for cn in cloned_nodes:
            cn["x"] = cn.get("x", 0) - min_x
            cn["y"] = cn.get("y", 0) - min_y

        comp_def = {
            "id": comp_id,
            "name": name,
            "category": category,
            "width": max(1, max_r - min_x),
            "height": max(1, max_b - min_y),
            "nodes": cloned_nodes,
        }
        return {"ok": True, "componentId": comp_id, "name": name, "component": comp_def}, doc

    if action == "insert_component_instance":
        screen_id = params.get("screenId")
        comp_id = params.get("componentId")
        if not screen_id or not comp_id:
            raise ValueError("screenId and componentId are required for insert_component_instance")

        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        inst_id = _new_id("inst")
        inst_node = {
            "id": inst_id,
            "type": "componentInstance",
            "componentId": str(comp_id).strip(),
            "name": params.get("name") or f"Instance of {comp_id}",
            "x": params.get("x", 24),
            "y": params.get("y", 100),
            "width": params.get("width", 200),
            "height": params.get("height", 48),
            "text": params.get("text", ""),
            "overrides": params.get("overrides", {}),
            "style": params.get("style", {}),
        }
        target_frame.setdefault("nodes", []).append(inst_node)
        return {"ok": True, "elementId": inst_id, "node": inst_node}, doc

    if action == "detach_component_instance":
        screen_id = params.get("screenId")
        node_id = params.get("nodeId")
        if not screen_id or not node_id:
            raise ValueError("screenId and nodeId are required for detach_component_instance")

        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        nodes = target_frame.get("nodes", [])
        idx = next((i for i, n in enumerate(nodes) if n.get("id") == node_id), -1)
        if idx == -1:
            raise ValueError(f"node '{node_id}' not found in screen")

        node = nodes[idx]
        if node.get("type") not in ("componentInstance", "componentinstance"):
            raise ValueError(f"node '{node_id}' is not a componentInstance")

        detached_id = _new_id("detached")
        overrides = node.get("overrides", {})
        detached_node = {
            "id": detached_id,
            "type": "rectangle",
            "name": node.get("name", "Component").replace(" Instance", "") + " (Detached)",
            "x": node.get("x", 0),
            "y": node.get("y", 0),
            "width": node.get("width", 200),
            "height": node.get("height", 48),
            "text": overrides.get("text", node.get("text", "")),
            "style": {**node.get("style", {}), **overrides.get("style", {})},
        }
        nodes[idx] = detached_node
        return {"ok": True, "detachedId": detached_id, "originalId": node_id}, doc

    if action == "update_design_tokens":
        tokens = params.get("tokens", {})
        if not isinstance(tokens, dict):
            raise ValueError("tokens must be a dictionary")
        return {"ok": True, "tokens": tokens}, doc

    if action == "apply_style_preset":
        screen_id = params.get("screenId")
        node_ids = params.get("nodeIds", [])
        preset = str(params.get("preset", "")).lower().replace(" ", "_").replace("-", "_")
        if not screen_id or not node_ids or not preset:
            raise ValueError("screenId, nodeIds, and preset are required for apply_style_preset")

        presets = {
            "primary_button": {"fill": "#18181b", "radius": 10, "color": "#ffffff", "fontWeight": 600, "fontSize": 15, "align": "center", "opacity": 100},
            "secondary_button": {"fill": "#f4f4f5", "stroke": "#d4d4d8", "strokeWidth": 1, "radius": 10, "color": "#18181b", "fontWeight": 600, "fontSize": 15, "align": "center", "opacity": 100},
            "input_field": {"fill": "#ffffff", "stroke": "#d4d4d8", "strokeWidth": 1, "radius": 10, "color": "#18181b", "fontSize": 14, "opacity": 100},
            "card": {"fill": "#f4f4f5", "stroke": "#e4e4e7", "strokeWidth": 1, "radius": 12, "opacity": 100},
            "app_bar": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1, "radius": 0, "opacity": 100},
            "bottom_navigation": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1, "radius": 0, "opacity": 100},
            "bottom_sheet": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1, "radius": 16, "opacity": 100},
            "dialog": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1, "radius": 14, "opacity": 100},
            "label": {"color": "#71717a", "fontSize": 12, "fontWeight": 500, "letterSpacing": 0.5, "opacity": 100},
            "heading": {"color": "#18181b", "fontSize": 22, "fontWeight": 700, "lineHeight": 1.2, "opacity": 100},
            "body_text": {"color": "#3f3f46", "fontSize": 15, "fontWeight": 400, "lineHeight": 1.4, "opacity": 100},
        }
        if preset not in presets:
            raise ValueError(f"Unknown preset '{preset}'. Available: {', '.join(presets.keys())}")

        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        matched = [n for n in target_frame.get("nodes", []) if n.get("id") in node_ids]
        preset_style = presets[preset]
        for n in matched:
            n.setdefault("style", {}).update(preset_style)

        return {"ok": True, "appliedCount": len(matched), "preset": preset}, doc

    if action == "update_text_content":
        screen_id = params.get("screenId")
        node_id = params.get("nodeId")
        text = str(params.get("text", ""))
        if not screen_id or not node_id:
            raise ValueError("screenId and nodeId are required for update_text_content")

        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        node = next((n for n in target_frame.get("nodes", []) if n.get("id") == node_id), None)
        if not node:
            raise ValueError(f"node '{node_id}' not found in screen")

        node["text"] = text
        return {"ok": True, "nodeId": node_id, "text": text}, doc

    if action == "create_auto_layout_from_selection":
        screen_id = params.get("screenId")
        node_ids = params.get("nodeIds", [])
        direction = str(params.get("direction", "vertical")).lower()
        if direction not in ("vertical", "horizontal"):
            direction = "vertical"
        gap = max(0.0, float(params.get("gap", 12)))
        raw_pad = params.get("padding", 16)
        if isinstance(raw_pad, (int, float)):
            padding = {"top": float(raw_pad), "right": float(raw_pad), "bottom": float(raw_pad), "left": float(raw_pad)}
        elif isinstance(raw_pad, dict):
            padding = {
                "top": max(0.0, float(raw_pad.get("top", 16))),
                "right": max(0.0, float(raw_pad.get("right", 16))),
                "bottom": max(0.0, float(raw_pad.get("bottom", 16))),
                "left": max(0.0, float(raw_pad.get("left", 16))),
            }
        else:
            padding = {"top": 16.0, "right": 16.0, "bottom": 16.0, "left": 16.0}
        align = str(params.get("align", "stretch")).lower()
        justify = str(params.get("justify", "start")).lower()
        wrap = bool(params.get("wrap", False))

        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")
        nodes = target_frame.get("nodes", [])
        matched = [n for n in nodes if n.get("id") in node_ids]
        if not matched:
            raise ValueError("No matching nodes found for auto layout")

        min_x = min(n.get("x", 0) for n in matched)
        min_y = min(n.get("y", 0) for n in matched)
        max_r = max(n.get("x", 0) + n.get("width", 100) for n in matched)
        max_b = max(n.get("y", 0) + n.get("height", 40) for n in matched)

        auto_id = _new_id("auto")
        auto_node = {
            "id": auto_id,
            "type": "autoLayout",
            "name": params.get("name") or "Auto Layout",
            "x": round(min_x),
            "y": round(min_y),
            "width": round(max_r - min_x),
            "height": round(max_b - min_y),
            "layout": {
                "direction": direction,
                "gap": gap,
                "padding": padding,
                "align": align if align in ("start", "center", "end", "stretch") else "stretch",
                "justify": justify if justify in ("start", "center", "end", "space-between") else "start",
                "wrap": wrap,
            },
            "children": [n.get("id") for n in matched],
            "style": {"fill": "transparent", "stroke": "transparent"},
        }
        for n in matched:
            n["parentId"] = auto_id
            if "layoutSizing" not in n:
                n["layoutSizing"] = {"width": "fixed", "height": "fixed"}

        target_frame["nodes"].append(auto_node)
        return {"ok": True, "autoLayoutId": auto_id, "children": auto_node["children"]}, doc

    if action == "update_auto_layout":
        screen_id = params.get("screenId")
        node_id = params.get("nodeId")
        layout_patch = params.get("layout", {})
        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")
        node = next((n for n in target_frame.get("nodes", []) if n.get("id") == node_id and n.get("type") == "autoLayout"), None)
        if not node:
            raise ValueError(f"autoLayout node '{node_id}' not found")
        curr_layout = node.setdefault("layout", {})
        if "direction" in layout_patch and layout_patch["direction"] in ("vertical", "horizontal"):
            curr_layout["direction"] = layout_patch["direction"]
        if "gap" in layout_patch:
            curr_layout["gap"] = max(0.0, float(layout_patch["gap"]))
        if "padding" in layout_patch:
            raw_p = layout_patch["padding"]
            if isinstance(raw_p, (int, float)):
                curr_layout["padding"] = {"top": float(raw_p), "right": float(raw_p), "bottom": float(raw_p), "left": float(raw_p)}
            elif isinstance(raw_p, dict):
                curr_layout.setdefault("padding", {})
                for s in ("top", "right", "bottom", "left"):
                    if s in raw_p:
                        curr_layout["padding"][s] = max(0.0, float(raw_p[s]))
        if "align" in layout_patch and layout_patch["align"] in ("start", "center", "end", "stretch"):
            curr_layout["align"] = layout_patch["align"]
        if "justify" in layout_patch and layout_patch["justify"] in ("start", "center", "end", "space-between"):
            curr_layout["justify"] = layout_patch["justify"]
        if "wrap" in layout_patch:
            curr_layout["wrap"] = bool(layout_patch["wrap"])
        return {"ok": True, "nodeId": node_id, "layout": curr_layout}, doc

    if action == "insert_into_auto_layout":
        screen_id = params.get("screenId")
        container_id = params.get("containerId")
        node_id = params.get("nodeId")
        index = params.get("index")
        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")
        container = next((n for n in target_frame.get("nodes", []) if n.get("id") == container_id and n.get("type") in ("autoLayout", "scrollArea")), None)
        if not container:
            raise ValueError(f"container '{container_id}' not found")
        child = next((n for n in target_frame.get("nodes", []) if n.get("id") == node_id), None)
        if not child:
            raise ValueError(f"node '{node_id}' not found")
        children = container.setdefault("children", [])
        if node_id in children:
            children.remove(node_id)
        if index is not None and 0 <= index <= len(children):
            children.insert(index, node_id)
        else:
            children.append(node_id)
        child["parentId"] = container_id
        return {"ok": True, "containerId": container_id, "children": children}, doc

    if action == "remove_from_auto_layout":
        screen_id = params.get("screenId")
        container_id = params.get("containerId")
        node_id = params.get("nodeId")
        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")
        container = next((n for n in target_frame.get("nodes", []) if n.get("id") == container_id), None)
        if not container:
            raise ValueError(f"container '{container_id}' not found")
        children = container.get("children", [])
        if node_id in children:
            children.remove(node_id)
        child = next((n for n in target_frame.get("nodes", []) if n.get("id") == node_id), None)
        if child and child.get("parentId") == container_id:
            child["parentId"] = None
        return {"ok": True, "containerId": container_id, "removedNodeId": node_id}, doc

    if action == "reorder_auto_layout_child":
        screen_id = params.get("screenId")
        container_id = params.get("containerId")
        node_id = params.get("nodeId")
        new_index = int(params.get("newIndex", 0))
        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")
        container = next((n for n in target_frame.get("nodes", []) if n.get("id") == container_id), None)
        if not container:
            raise ValueError(f"container '{container_id}' not found")
        children = container.get("children", [])
        if node_id not in children:
            raise ValueError(f"node '{node_id}' is not a child of container '{container_id}'")
        children.remove(node_id)
        new_index = max(0, min(new_index, len(children)))
        children.insert(new_index, node_id)
        return {"ok": True, "containerId": container_id, "children": children}, doc

    if action == "update_constraints":
        screen_id = params.get("screenId")
        node_id = params.get("nodeId")
        constraints = params.get("constraints", {})
        layout_sizing = params.get("layoutSizing")
        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")
        node = next((n for n in target_frame.get("nodes", []) if n.get("id") == node_id), None)
        if not node:
            raise ValueError(f"node '{node_id}' not found")
        if constraints:
            node.setdefault("constraints", {})
            h = constraints.get("horizontal")
            v = constraints.get("vertical")
            if h in ("left", "right", "left-right", "center", "scale"):
                node["constraints"]["horizontal"] = h
            if v in ("top", "bottom", "top-bottom", "center", "scale"):
                node["constraints"]["vertical"] = v
        if layout_sizing and isinstance(layout_sizing, dict):
            node.setdefault("layoutSizing", {})
            w_s = layout_sizing.get("width")
            h_s = layout_sizing.get("height")
            if w_s in ("fixed", "fill", "hug"):
                node["layoutSizing"]["width"] = w_s
            if h_s in ("fixed", "fill", "hug"):
                node["layoutSizing"]["height"] = h_s
        return {"ok": True, "nodeId": node_id, "constraints": node.get("constraints"), "layoutSizing": node.get("layoutSizing")}, doc

    if action == "update_frame_preset":
        screen_id = params.get("screenId")
        preset = str(params.get("preset", "iPhone 15"))
        apply_constraints = bool(params.get("applyConstraints", True))
        FRAME_PRESETS = {
            "iPhone 15": (390, 844),
            "iPhone SE": (375, 667),
            "Android Compact": (360, 800),
            "Android Large": (412, 915),
            "Custom Size": (params.get("width", 390), params.get("height", 844)),
        }
        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")

        old_w = float(target_frame.get("width", 390))
        old_h = float(target_frame.get("height", 844))

        if preset in FRAME_PRESETS and preset != "Custom Size":
            new_w, new_h = FRAME_PRESETS[preset]
        else:
            new_w = float(params.get("width", old_w))
            new_h = float(params.get("height", old_h))

        target_frame["preset"] = preset
        target_frame["width"] = round(new_w)
        target_frame["height"] = round(new_h)

        if apply_constraints and (old_w != new_w or old_h != new_h):
            for n in target_frame.get("nodes", []):
                # Only apply to top-level elements
                if n.get("parentId"):
                    continue
                c = n.get("constraints", {})
                h_c = c.get("horizontal", "left")
                v_c = c.get("vertical", "top")
                x, y = float(n.get("x", 0)), float(n.get("y", 0))
                w, h = float(n.get("width", 100)), float(n.get("height", 40))

                # Horizontal
                if h_c == "right":
                    right_dist = old_w - (x + w)
                    n["x"] = round(new_w - right_dist - w)
                elif h_c == "left-right":
                    right_dist = old_w - (x + w)
                    n["width"] = round(max(10, new_w - right_dist - x))
                elif h_c == "center":
                    center_old = x + w / 2.0
                    ratio = center_old / old_w if old_w else 0.5
                    center_new = ratio * new_w
                    n["x"] = round(center_new - w / 2.0)
                elif h_c == "scale":
                    n["x"] = round((x / old_w) * new_w) if old_w else x
                    n["width"] = round(max(10, (w / old_w) * new_w)) if old_w else w

                # Vertical
                if v_c == "bottom":
                    bottom_dist = old_h - (y + h)
                    n["y"] = round(new_h - bottom_dist - h)
                elif v_c == "top-bottom":
                    bottom_dist = old_h - (y + h)
                    n["height"] = round(max(10, new_h - bottom_dist - y))
                elif v_c == "center":
                    center_old = y + h / 2.0
                    ratio = center_old / old_h if old_h else 0.5
                    center_new = ratio * new_h
                    n["y"] = round(center_new - h / 2.0)
                elif v_c == "scale":
                    n["y"] = round((y / old_h) * new_h) if old_h else y
                    n["height"] = round(max(10, (h / old_h) * new_h)) if old_h else h

        return {"ok": True, "screenId": screen_id, "preset": preset, "width": target_frame["width"], "height": target_frame["height"]}, doc

    if action == "update_safe_area":
        screen_id = params.get("screenId")
        sa_patch = params.get("safeArea", {})
        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")
        curr_sa = target_frame.setdefault("safeArea", {"top": 44, "bottom": 34, "left": 0, "right": 0, "visible": True})
        for side in ("top", "bottom", "left", "right"):
            if side in sa_patch:
                curr_sa[side] = max(0.0, float(sa_patch[side]))
        if "visible" in sa_patch:
            curr_sa["visible"] = bool(sa_patch["visible"])
        return {"ok": True, "screenId": screen_id, "safeArea": curr_sa}, doc

    if action == "create_scroll_area":
        screen_id = params.get("screenId")
        node_ids = params.get("nodeIds", [])
        direction = str(params.get("direction", "vertical")).lower()
        if direction not in ("vertical", "horizontal", "both"):
            direction = "vertical"
        content_height = max(0.0, float(params.get("contentHeight", 1000)))
        content_width = max(0.0, float(params.get("contentWidth", 390)))
        x = float(params.get("x", 0))
        y = float(params.get("y", 60))
        w = float(params.get("width", 390))
        h = float(params.get("height", 650))
        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")
        scroll_id = _new_id("scroll")
        matched = [n for n in target_frame.get("nodes", []) if n.get("id") in node_ids]
        for n in matched:
            n["parentId"] = scroll_id
        scroll_node = {
            "id": scroll_id,
            "type": "scrollArea",
            "name": params.get("name") or "Scroll Area",
            "x": round(x),
            "y": round(y),
            "width": round(w),
            "height": round(h),
            "scroll": {
                "direction": direction,
                "contentHeight": round(content_height),
                "contentWidth": round(content_width),
                "showIndicator": bool(params.get("showIndicator", True)),
            },
            "children": [n.get("id") for n in matched],
            "style": {"fill": "transparent", "stroke": "transparent"},
        }
        target_frame["nodes"].append(scroll_node)
        return {"ok": True, "scrollAreaId": scroll_id, "children": scroll_node["children"]}, doc

    if action == "export_project_low_json":
        return {"ok": True, "lowVersion": "1.0.0", "document": {"frames": doc}}, doc

    if action == "export_design_tokens":
        tokens = params.get("tokens") or {}
        return {"ok": True, "designTokens": tokens}, doc

    if action == "export_frame_svg":
        screen_id = params.get("screenId")
        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")
        w = target_frame.get("width", 390)
        h = target_frame.get("height", 844)
        svg_parts = [
            f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">',
            f'<rect width="{w}" height="{h}" fill="#ffffff" />',
        ]
        for n in target_frame.get("nodes", []):
            if not n.get("hidden"):
                fill = n.get("style", {}).get("fill", "#eeeeee")
                svg_parts.append(
                    f'<rect id="{n.get("id")}" x="{n.get("x",0)}" y="{n.get("y",0)}" width="{n.get("width",100)}" height="{n.get("height",40)}" fill="{fill}" />'
                )
        svg_parts.append("</svg>")
        return {"ok": True, "screenId": screen_id, "svg": "\n".join(svg_parts)}, doc

    if action == "get_inspect_data":
        screen_id = params.get("screenId")
        node_id = params.get("nodeId")
        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")
        node = next((n for n in target_frame.get("nodes", []) if n.get("id") == node_id), None)
        if not node:
            raise ValueError(f"node '{node_id}' not found")
        return {
            "ok": True,
            "inspect": {
                "id": node.get("id"),
                "name": node.get("name"),
                "type": node.get("type"),
                "layout": {
                    "x": node.get("x", 0),
                    "y": node.get("y", 0),
                    "width": node.get("width", 100),
                    "height": node.get("height", 40),
                    "parentId": node.get("parentId"),
                    "layoutSizing": node.get("layoutSizing"),
                },
                "appearance": {
                    "fill": node.get("style", {}).get("fill"),
                    "stroke": node.get("style", {}).get("stroke"),
                    "radius": node.get("style", {}).get("radius"),
                    "opacity": node.get("style", {}).get("opacity"),
                },
                "typography": (
                    {
                        "fontFamily": node.get("style", {}).get("fontFamily"),
                        "fontSize": node.get("style", {}).get("fontSize"),
                        "fontWeight": node.get("style", {}).get("fontWeight"),
                        "color": node.get("style", {}).get("color"),
                    }
                    if node.get("type") in ("text", "button", "input")
                    else None
                ),
                "autoLayout": node.get("layout"),
                "constraints": node.get("constraints"),
                "prototype": node.get("prototype"),
            },
        }, doc

    if action == "get_node_css":
        screen_id = params.get("screenId")
        node_id = params.get("nodeId")
        target_frame = next((f for f in doc if f.get("id") == screen_id), None)
        if not target_frame:
            raise ValueError(f"screen '{screen_id}' not found")
        node = next((n for n in target_frame.get("nodes", []) if n.get("id") == node_id), None)
        if not node:
            raise ValueError(f"node '{node_id}' not found")
        s = node.get("style", {})
        css_lines = [
            f".low-{node.get('type','element')} {{",
            "  position: absolute;",
            f"  left: {node.get('x',0)}px;",
            f"  top: {node.get('y',0)}px;",
            f"  width: {node.get('width',100)}px;",
            f"  height: {node.get('height',40)}px;",
        ]
        if s.get("fill"):
            css_lines.append(f"  background: {s['fill']};")
        if s.get("stroke"):
            css_lines.append(f"  border: {s.get('strokeWidth',1)}px solid {s['stroke']};")
        if s.get("radius"):
            css_lines.append(f"  border-radius: {s['radius']}px;")
        if s.get("color"):
            css_lines.append(f"  color: {s['color']};")
        if s.get("fontSize"):
            css_lines.append(f"  font-size: {s['fontSize']}px;")
        if s.get("fontWeight"):
            css_lines.append(f"  font-weight: {s['fontWeight']};")
        css_lines.append("}")
        return {"ok": True, "nodeId": node_id, "css": "\n".join(css_lines)}, doc

    if action == "get_prototype_package":
        total_screens = len(doc)
        total_nodes = sum(len(f.get("nodes", [])) for f in doc)
        return {
            "ok": True,
            "package": {
                "format": "prototype.zip",
                "screensCount": total_screens,
                "nodesCount": total_nodes,
                "viewer": "index.html",
            },
        }, doc

    raise ValueError(f"unknown action: {action}")


AGENT_SCHEMA = {
    "name": "LOW Universal Agent Connect API",
    "version": "2.4.0",
    "description": "Read and safely modify a LOW mobile UI/UX design. All mutations are atomic, scoped, and leave an audit log.",
    "auth": {"type": "header", "header": "X-LOW-Token", "note": "Token returned once when session is created. Required for POST /actions."},
    "scopes": ALL_SCOPES,
    "presets": list(PRESET_SCOPES.keys()),
    "limits": {
        "max_payload_bytes": 1048576,
        "max_batch_operations": 25,
    },
    "actions": [
        {"action": "get_document", "scope": "read_document", "params": {}, "returns": "all screens with their elements"},
        {"action": "list_screens", "scope": "read_document", "params": {}, "returns": "id, name, element count of each screen"},
        {"action": "create_screen", "scope": "create_screen", "params": {"name": "string", "elements": "optional array of elements"}},
        {"action": "rename_screen", "scope": "edit_screen", "params": {"screenId": "string", "name": "string"}},
        {"action": "delete_screen", "scope": "delete_screen", "params": {"screenId": "string"}},
        {"action": "duplicate_screen", "scope": "create_screen", "params": {"screenId": "string", "name": "optional string"}},
        {"action": "add_element", "scope": "edit_screen", "params": {"screenId": "string", "element": {"type": "string", "x": "number", "y": "number", "width": "number", "height": "number", "text": "string", "style": "object"}}},
        {"action": "update_element", "scope": "edit_screen", "params": {"screenId": "string", "elementId": "string", "patch": "object"}},
        {"action": "move_element", "scope": "edit_screen", "params": {"screenId": "string", "elementId": "string", "x": "number", "y": "number"}},
        {"action": "resize_element", "scope": "edit_screen", "params": {"screenId": "string", "elementId": "string", "width": "number", "height": "number"}},
        {"action": "duplicate_element", "scope": "edit_screen", "params": {"screenId": "string", "elementId": "string", "offsetX": "optional number", "offsetY": "optional number"}},
        {"action": "delete_element", "scope": "edit_screen", "params": {"screenId": "string", "elementId": "string"}},
        {"action": "group_elements", "scope": "edit_screen", "params": {"screenId": "string", "nodeIds": "array of strings", "groupName": "optional string"}},
        {"action": "ungroup_element", "scope": "edit_screen", "params": {"screenId": "string", "groupId": "string"}},
        {"action": "align_elements", "scope": "edit_screen", "params": {"screenId": "string", "nodeIds": "array of strings", "alignment": "left|center|right|top|middle|bottom"}},
        {"action": "distribute_elements", "scope": "edit_screen", "params": {"screenId": "string", "nodeIds": "array of strings", "axis": "horizontal|vertical"}},
        {"action": "set_layer_visibility", "scope": "edit_screen", "params": {"screenId": "string", "nodeId": "string", "hidden": "boolean"}},
        {"action": "set_layer_lock", "scope": "edit_screen", "params": {"screenId": "string", "nodeId": "string", "locked": "boolean"}},
        {"action": "reorder_layer", "scope": "edit_screen", "params": {"screenId": "string", "nodeId": "string", "direction": "forward|backward|front|back"}},
        {"action": "create_component_from_selection", "scope": "manage_components", "params": {"screenId": "string", "nodeIds": "array of strings", "name": "optional string", "category": "optional string"}},
        {"action": "insert_component_instance", "scope": "edit_screen", "params": {"screenId": "string", "componentId": "string", "x": "optional number", "y": "optional number", "width": "optional number", "height": "optional number", "overrides": "optional object"}},
        {"action": "detach_component_instance", "scope": "edit_screen", "params": {"screenId": "string", "nodeId": "string"}},
        {"action": "update_design_tokens", "scope": "write_document", "params": {"tokens": "object with colors, radius, spacing"}},
        {"action": "apply_style_preset", "scope": "edit_screen", "params": {"screenId": "string", "nodeIds": "array of strings", "preset": "primary_button|secondary_button|input_field|card|heading|body_text|label|app_bar|bottom_navigation|bottom_sheet|dialog"}},
        {"action": "update_text_content", "scope": "edit_screen", "params": {"screenId": "string", "nodeId": "string", "text": "string"}},
        {"action": "create_auto_layout_from_selection", "scope": "edit_screen", "params": {"screenId": "string", "nodeIds": "array of strings", "direction": "vertical|horizontal", "gap": "optional number", "padding": "optional object or number", "align": "optional start|center|end|stretch", "justify": "optional start|center|end|space-between", "wrap": "optional boolean"}},
        {"action": "update_auto_layout", "scope": "edit_screen", "params": {"screenId": "string", "nodeId": "string", "layout": "object"}},
        {"action": "insert_into_auto_layout", "scope": "edit_screen", "params": {"screenId": "string", "containerId": "string", "nodeId": "string", "index": "optional number"}},
        {"action": "remove_from_auto_layout", "scope": "edit_screen", "params": {"screenId": "string", "containerId": "string", "nodeId": "string"}},
        {"action": "reorder_auto_layout_child", "scope": "edit_screen", "params": {"screenId": "string", "containerId": "string", "nodeId": "string", "newIndex": "number"}},
        {"action": "update_constraints", "scope": "edit_screen", "params": {"screenId": "string", "nodeId": "string", "constraints": "optional object", "layoutSizing": "optional object"}},
        {"action": "update_frame_preset", "scope": "edit_screen", "params": {"screenId": "string", "preset": "string", "width": "optional number", "height": "optional number", "applyConstraints": "optional boolean"}},
        {"action": "update_safe_area", "scope": "edit_screen", "params": {"screenId": "string", "safeArea": "object"}},
        {"action": "create_scroll_area", "scope": "edit_screen", "params": {"screenId": "string", "nodeIds": "optional array", "direction": "vertical|horizontal|both", "contentHeight": "optional number", "contentWidth": "optional number", "x": "optional number", "y": "optional number", "width": "optional number", "height": "optional number"}},
        {"action": "export_project_low_json", "scope": "read_document", "params": {}, "returns": "full document JSON"},
        {"action": "export_design_tokens", "scope": "read_document", "params": {"tokens": "optional object"}, "returns": "design tokens object and css"},
        {"action": "export_frame_svg", "scope": "read_document", "params": {"screenId": "string"}, "returns": "SVG string of frame"},
        {"action": "get_inspect_data", "scope": "read_document", "params": {"screenId": "string", "nodeId": "string"}, "returns": "identity, layout, appearance, typography, autoLayout, constraints"},
        {"action": "get_node_css", "scope": "read_document", "params": {"screenId": "string", "nodeId": "string"}, "returns": "CSS rule snippet"},
        {"action": "get_prototype_package", "scope": "read_document", "params": {}, "returns": "prototype package metadata"},
        {"action": "link_prototype", "scope": "edit_screen", "params": {"screenId": "string", "elementId": "string", "target": "screenId", "trigger": "tap", "action": "navigate", "transition": "slide"}},
        {"action": "create_component", "scope": "manage_components", "params": {"name": "string", "node": "object", "category": "optional string"}},
        {"action": "update_component", "scope": "manage_components", "params": {"componentId": "string", "patch": "object"}},
        {"action": "save_template", "scope": "manage_templates", "params": {"name": "string", "screenId": "optional string", "nodes": "optional array"}},
        {"action": "create_ai_draft", "scope": "run_ai_import", "params": {"prompt": "string", "resultType": "string (screen|component|template|prototype)", "provider": "optional string"}},
        {"action": "apply_ai_draft", "scope": "apply_ai_import", "params": {"draftId": "string"}},
        {"action": "apply_ai_import", "scope": "apply_ai_import", "params": {"patch": "object"}},
        {"action": "batch_update", "scope": "batch_update", "params": {"operations": "array of up to 25 action objects"}},
        {"action": "undo_last_agent_change", "scope": "undo_changes", "params": {}},
    ],
}



def verify_session_scope(sess: AgentSession, action: str, dry_run: bool = False) -> str:
    """Verifies that the session has permissions for the requested action. Returns matched scope."""
    sess_scopes = json.loads(sess.scopes_json) if sess.scopes_json else []
    
    if dry_run and "dry_run" in sess_scopes:
        # Dry run permitted if dry_run scope is present
        pass
    elif dry_run and ("read_document" in sess_scopes or "write_document" in sess_scopes):
        pass
    elif dry_run:
        raise HTTPException(status_code=403, detail="Session lacks 'dry_run' permission scope")

    req_scopes = ACTION_SCOPES.get(action, [])
    # Check if session has any of the accepted scopes
    matched = next((s for s in req_scopes if s in sess_scopes), None)
    if not matched:
        raise HTTPException(
            status_code=403,
            detail=f"Session lacks required permission scope for action '{action}'. Required one of: {req_scopes}",
        )
    return matched


async def verify_session_token(sess: AgentSession, token: Optional[str]) -> None:
    if not token:
        raise HTTPException(status_code=401, detail="Missing X-LOW-Token header")
    if hash_agent_token(token) != sess.token_hash:
        raise HTTPException(status_code=401, detail="Invalid X-LOW-Token")
    if sess.is_revoked:
        raise HTTPException(status_code=403, detail="Agent session has been revoked")
    if sess.expires_at:
        exp = sess.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Agent session has expired")


async def cleanup_expired_sessions(session: AsyncSession) -> int:
    now = datetime.now(timezone.utc)
    stmt = select(AgentSession).where(AgentSession.expires_at < now)
    result = await session.execute(stmt)
    expired = result.scalars().all()
    count = len(expired)
    for s in expired:
        await session.delete(s)
    if count > 0:
        await session.commit()
    return count


async def create_session(
    session: AsyncSession,
    name: Optional[str] = "LOW Session",
    document: Optional[List[dict]] = None,
    project_id: Optional[str] = None,
    preset: Optional[str] = "full_editor_assistant",
    scopes: Optional[List[str]] = None,
) -> Tuple[AgentSession, str]:
    try:
        await cleanup_expired_sessions(session)
    except Exception:
        pass

    raw_token = generate_agent_token()
    token_hash = hash_agent_token(raw_token)
    doc = document if (document and isinstance(document, list) and len(document) > 0) else _default_document()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.AGENT_SESSION_EXPIRE_MINUTES)

    # Determine scopes
    if scopes and isinstance(scopes, list) and len(scopes) > 0:
        effective_scopes = [s for s in scopes if s in ALL_SCOPES]
        selected_preset = preset or "custom"
    else:
        selected_preset = preset if preset in PRESET_SCOPES else "full_editor_assistant"
        effective_scopes = PRESET_SCOPES.get(selected_preset, ALL_SCOPES)

    sess = AgentSession(
        project_id=project_id,
        token_hash=token_hash,
        document_snapshot_json=json.dumps(doc),
        seq=0,
        scopes_json=json.dumps(effective_scopes),
        preset_name=selected_preset,
        is_revoked=False,
        expires_at=expires_at,
    )
    session.add(sess)
    await session.commit()
    await session.refresh(sess)
    return sess, raw_token


async def get_session_by_id(session: AsyncSession, sid: str) -> AgentSession:
    stmt = select(AgentSession).where(AgentSession.id == sid)
    result = await session.execute(stmt)
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Agent session not found")
    return sess


async def revoke_session(session: AsyncSession, sid: str) -> AgentSession:
    sess = await get_session_by_id(session, sid)
    sess.is_revoked = True
    sess.revoked_at = utc_now()
    await session.commit()
    await session.refresh(sess)
    return sess


async def execute_agent_action(
    session: AsyncSession,
    sid: str,
    action: str,
    params: Dict[str, Any],
    token: Optional[str],
    dry_run: bool = False,
) -> Dict[str, Any]:
    sess = await get_session_by_id(session, sid)
    await verify_session_token(sess, token)
    if action not in ALLOWED_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Action '{action}' is not in the allowed actions list")
    scope_used = verify_session_scope(sess, action, dry_run=dry_run)

    doc = json.loads(sess.document_snapshot_json)
    doc_before_json = sess.document_snapshot_json

    # Handle special actions (AI draft generation / apply / undo)
    if action == "create_ai_draft":
        prompt = params.get("prompt", "")
        result_type = params.get("resultType", "screen")
        provider_name = params.get("provider")
        provider = get_ai_provider(provider_name)

        start_time = datetime.now(timezone.utc)
        raw_patch, usage_info = await provider.generate_low_patch(prompt=prompt, result_type=result_type)
        valid, clean_patch, errors, warnings = validate_and_guard_ai_patch(raw_patch, result_type=result_type)
        duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)

        # Save draft
        draft = AIImportDraft(
            owner_id="usr_default",
            project_id=sess.project_id,
            provider=provider.provider_name,
            model=provider.model_name,
            result_type=result_type,
            prompt=prompt,
            draft_json=json.dumps(clean_patch),
            validation_json=json.dumps({"valid": valid, "warnings": warnings, "errors": errors}),
            status="valid" if valid else "invalid",
            duration_ms=duration_ms,
            token_usage_json=json.dumps(usage_info) if usage_info else None,
        )
        session.add(draft)
        await session.commit()
        await session.refresh(draft)

        return {
            "ok": True,
            "seq": sess.seq,
            "action": action,
            "dryRun": dry_run,
            "result": {
                "draftId": draft.id,
                "resultType": result_type,
                "status": draft.status,
                "valid": valid,
                "warnings": warnings,
                "errors": errors,
            },
            "frames": doc,
        }

    if action == "apply_ai_draft":
        draft_id = params.get("draftId")
        if not draft_id:
            raise HTTPException(status_code=400, detail="draftId is required")
        stmt = select(AIImportDraft).where(AIImportDraft.id == draft_id)
        d_res = await session.execute(stmt)
        draft = d_res.scalar_one_or_none()
        if not draft:
            raise HTTPException(status_code=404, detail="AI draft not found")

        patch = json.loads(draft.draft_json)
        valid, clean_patch, errors, warnings = validate_and_guard_ai_patch(patch, result_type=draft.result_type)
        if not valid:
            raise HTTPException(status_code=400, detail=f"Cannot apply invalid draft: {errors}")

        new_frames = clean_patch.get("frames", [])
        new_doc = doc + new_frames

        if not dry_run:
            sess.seq += 1
            sess.document_snapshot_json = json.dumps(new_doc)
            draft.status = "applied"
            draft.applied_at = utc_now()

            event = AgentEvent(
                session_id=sess.id,
                seq=sess.seq,
                action=action,
                params_json=json.dumps(params),
                result_json=json.dumps({"draftId": draft_id, "appliedFrames": len(new_frames)}),
                document_before_json=doc_before_json,
                document_after_json=sess.document_snapshot_json,
                dry_run=False,
                scope_used=scope_used,
                status="applied",
            )
            session.add(event)
            await session.commit()
            await session.refresh(sess)

        return {
            "ok": True,
            "seq": sess.seq,
            "action": action,
            "dryRun": dry_run,
            "result": {"draftId": draft_id, "appliedFrames": len(new_frames)},
            "frames": new_doc,
        }

    if action == "undo_last_agent_change":
        undone_res = await undo_last_session_event(session, sid)
        return {
            "ok": True,
            "seq": sess.seq,
            "action": action,
            "dryRun": False,
            "result": undone_res,
            "frames": json.loads(sess.document_snapshot_json),
        }

    # Standard actions
    try:
        result, new_doc = apply_action(doc, action, params)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    mutating = action not in ("get_document", "list_screens")

    if dry_run:
        return {
            "ok": True,
            "seq": sess.seq,
            "dryRun": True,
            "action": action,
            "result": result,
            "frames": new_doc,
        }

    if mutating:
        sess.seq += 1
        sess.document_snapshot_json = json.dumps(new_doc)
        event = AgentEvent(
            session_id=sess.id,
            seq=sess.seq,
            action=action,
            params_json=json.dumps(params),
            result_json=json.dumps(result),
            document_before_json=doc_before_json,
            document_after_json=sess.document_snapshot_json,
            dry_run=False,
            scope_used=scope_used,
            status="applied",
        )
        session.add(event)
        await session.commit()
        await session.refresh(sess)

    return {
        "ok": True,
        "seq": sess.seq,
        "dryRun": False,
        "action": action,
        "result": result,
        "frames": new_doc,
    }


async def undo_session_event(session: AsyncSession, sid: str, event_id: str) -> Dict[str, Any]:
    sess = await get_session_by_id(session, sid)
    stmt = select(AgentEvent).where(AgentEvent.id == event_id, AgentEvent.session_id == sid)
    res = await session.execute(stmt)
    event = res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Agent event not found")
    if event.status == "undone":
        raise HTTPException(status_code=400, detail="Event has already been undone")
    if not event.document_before_json:
        raise HTTPException(status_code=400, detail="Event does not contain prior document state to revert to")

    sess.document_snapshot_json = event.document_before_json
    event.status = "undone"
    await session.commit()
    await session.refresh(sess)

    return {
        "ok": True,
        "undoneEventId": event.id,
        "action": event.action,
        "frames": json.loads(sess.document_snapshot_json),
    }


async def undo_last_session_event(session: AsyncSession, sid: str) -> Dict[str, Any]:
    sess = await get_session_by_id(session, sid)
    stmt = (
        select(AgentEvent)
        .where(
            AgentEvent.session_id == sid,
            AgentEvent.status == "applied",
            AgentEvent.dry_run == False,
        )
        .order_by(desc(AgentEvent.seq))
        .limit(1)
    )
    res = await session.execute(stmt)
    event = res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=400, detail="No applied mutating agent events to undo")
    if not event.document_before_json:
        raise HTTPException(status_code=400, detail="Last event does not have prior document snapshot")

    sess.document_snapshot_json = event.document_before_json
    event.status = "undone"
    await session.commit()
    await session.refresh(sess)

    return {
        "ok": True,
        "undoneEventId": event.id,
        "action": event.action,
        "frames": json.loads(sess.document_snapshot_json),
    }


async def get_session_events(session: AsyncSession, sid: str, after: int = 0) -> Tuple[int, List[dict], List[dict]]:
    sess = await get_session_by_id(session, sid)
    stmt = select(AgentEvent).where(
        AgentEvent.session_id == sid,
        AgentEvent.seq > after,
    ).order_by(AgentEvent.seq.asc()).limit(200)

    result = await session.execute(stmt)
    events = result.scalars().all()

    formatted_events = [
        {
            "id": e.id,
            "seq": e.seq,
            "action": e.action,
            "params": json.loads(e.params_json),
            "result": json.loads(e.result_json),
            "dry_run": e.dry_run,
            "scope_used": e.scope_used,
            "status": e.status,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]

    doc = json.loads(sess.document_snapshot_json)
    return sess.seq, doc, formatted_events


def generate_session_instructions(sess: AgentSession, base_url: str) -> Dict[str, Any]:
    scopes = json.loads(sess.scopes_json) if sess.scopes_json else []
    endpoint = f"{base_url}/api/agent"
    
    prompt = f"""You can control my LOW mobile UI/UX design over HTTP.

Base URL: {endpoint}
Session ID: {sess.id}
Auth Header: X-LOW-Token: <YOUR_TOKEN_HERE>
Preset: {sess.preset_name or 'custom'}
Granted Scopes: {', '.join(scopes)}

Endpoints:
1. Discover schema:
   GET {endpoint}/schema
2. Read design document:
   GET {endpoint}/sessions/{sess.id}/document
3. Execute actions:
   POST {endpoint}/sessions/{sess.id}/actions
   Headers: {{ "X-LOW-Token": "<YOUR_TOKEN_HERE>", "Content-Type": "application/json" }}
   Body: {{ "action": "<action_name>", "params": {{ ... }}, "dryRun": false }}

Dry Run Mode:
   Pass `"dryRun": true` in the request body to validate and preview changes without modifying the document.

Batch Update:
   Execute up to 25 operations atomically:
   {{
     "action": "batch_update",
     "params": {{
       "operations": [
         {{ "action": "add_element", "params": {{ ... }} }},
         {{ "action": "link_prototype", "params": {{ ... }} }}
       ]
     }}
   }}

Example — Add a primary submit button:
curl -X POST "{endpoint}/sessions/{sess.id}/actions" \\
  -H "X-LOW-Token: <YOUR_TOKEN_HERE>" \\
  -H "Content-Type: application/json" \\
  -d '{{"action": "add_element", "params": {{"screenId": "frame_1", "element": {{"type": "button", "text": "Submit", "x": 24, "y": 600, "width": 342, "height": 50}}}}}}'
"""

    curl_example = f"""curl -X POST "{endpoint}/sessions/{sess.id}/actions" \\
  -H "X-LOW-Token: <YOUR_TOKEN_HERE>" \\
  -H "Content-Type: application/json" \\
  -d '{{"action": "add_element", "params": {{"screenId": "<screen_id>", "element": {{"type": "button", "text": "Continue", "x": 24, "y": 600, "width": 342, "height": 50}}}}}}'"""

    return {
        "baseUrl": base_url,
        "sessionId": sess.id,
        "tokenInstruction": "Pass the secret token received upon session creation in the 'X-LOW-Token' header.",
        "authHeader": "X-LOW-Token",
        "schemaEndpoint": f"{endpoint}/schema",
        "documentEndpoint": f"{endpoint}/sessions/{sess.id}/document",
        "actionsEndpoint": f"{endpoint}/sessions/{sess.id}/actions",
        "scopes": scopes,
        "preset": sess.preset_name,
        "actionLimits": {
            "maxPayloadBytes": 1048576,
            "maxBatchOperations": 25,
        },
        "dryRunGuide": "Include 'dryRun': true in action body to simulate changes without mutating the document.",
        "batchUpdateGuide": "Use action 'batch_update' with params: {'operations': [...]} (max 25 operations, atomic).",
        "curlExample": curl_example,
        "promptText": prompt,
    }
