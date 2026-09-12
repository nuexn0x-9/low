import json
import uuid
from typing import Tuple, Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.project import Project
from app.models.document import Document
from app.services.document_service import get_or_create_document, create_document_version


def _gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


ALLOWED_NODE_TYPES = {
    "text",
    "rectangle",
    "input",
    "button",
    "link",
    "image",
    "bottomnav",
    "component",
    "group",
    "componentinstance",
    "componentInstance",
}


def normalize_node(raw: Dict[str, Any], frame_name: str, index: int) -> Dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError(f"Node at index {index} in frame '{frame_name}' is not an object")

    node_type = str(raw.get("type", "rectangle")).lower()
    if node_type not in ALLOWED_NODE_TYPES:
        raise ValueError(
            f"Node at index {index} in frame '{frame_name}' has unsupported type '{node_type}'. Allowed types: {', '.join(sorted(ALLOWED_NODE_TYPES))}"
        )

    node_id = str(raw.get("id") or _gen_id(node_type))
    name = str(raw.get("name") or node_type.title())

    # Check required numeric bounds
    try:
        x = float(raw.get("x", 0))
        y = float(raw.get("y", 0))
        width = float(raw.get("width", 100))
        height = float(raw.get("height", 40))
    except (TypeError, ValueError):
        raise ValueError(f"Node '{node_id}' in frame '{frame_name}' has invalid dimensions/coordinates (x, y, width, height must be numeric)")

    if width < 0 or height < 0:
        raise ValueError(f"Node '{node_id}' in frame '{frame_name}' has negative dimensions (width={width}, height={height})")

    style = raw.get("style", {})
    if not isinstance(style, dict):
        style = {}

    node = {
        "id": node_id,
        "type": node_type,
        "name": name,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "text": str(raw.get("text", "")),
        "style": style,
    }

    # Group node children validation
    if node_type == "group":
        raw_children = raw.get("children", [])
        if not isinstance(raw_children, list):
            raise ValueError(f"Group node '{node_id}' in frame '{frame_name}' must have a list of children IDs")
        # Ensure no self-reference (circular check)
        if node_id in raw_children:
            raise ValueError(f"Group node '{node_id}' in frame '{frame_name}' cannot include itself as a child")
        node["children"] = [str(c) for c in raw_children]

    # Component instance validation
    if node_type in ("componentinstance", "componentinstance"):
        node["type"] = "componentInstance"
        comp_id = raw.get("componentId")
        if not comp_id or not isinstance(comp_id, str) or not comp_id.strip():
            raise ValueError(f"Node '{node_id}' of type 'componentInstance' must have a non-empty 'componentId'")
        node["componentId"] = str(comp_id).strip()
        overrides = raw.get("overrides", {})
        node["overrides"] = overrides if isinstance(overrides, dict) else {}

    # Layer workflow flags
    if "locked" in raw:
        node["locked"] = bool(raw.get("locked"))
    if "hidden" in raw:
        node["hidden"] = bool(raw.get("hidden"))

    if "prototype" in raw and isinstance(raw["prototype"], dict):
        proto = raw["prototype"]
        trigger = str(proto.get("trigger", "none"))
        action = str(proto.get("action", "navigate"))
        if trigger not in ("none", "tap", "longpress"):
            raise ValueError(f"Node '{node_id}' has invalid prototype trigger '{trigger}'")
        if action not in ("none", "navigate", "back", "overlay"):
            raise ValueError(f"Node '{node_id}' has invalid prototype action '{action}'")
        if action == "overlay":
            overlay_type = proto.get("overlayType", "bottom-sheet")
            if overlay_type not in ("bottom-sheet", "centered-dialog"):
                raise ValueError(f"Node '{node_id}' has invalid overlayType '{overlay_type}'")
        node["prototype"] = proto

    return node



def normalize_frame(raw: Dict[str, Any], index: int) -> Dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError(f"Frame at index {index} is not an object")

    frame_id = str(raw.get("id") or _gen_id("frame"))
    frame_name = str(raw.get("name") or f"Screen {index + 1}")

    raw_nodes = raw.get("nodes", [])
    if not isinstance(raw_nodes, list):
        raw_nodes = []

    normalized_nodes = [
        normalize_node(n, frame_name, i) for i, n in enumerate(raw_nodes)
    ]

    return {
        "id": frame_id,
        "name": frame_name,
        "nodes": normalized_nodes,
    }


def validate_and_normalize_low_data(data: Any) -> Tuple[bool, str, List[Dict[str, Any]], List[str], List[str]]:
    errors: List[str] = []
    warnings: List[str] = []

    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception as e:
            return False, "1.0.0", [], [f"Invalid JSON: {str(e)}"], []

    if not isinstance(data, (dict, list)):
        return False, "1.0.0", [], ["Root content must be a JSON object or array of frames"], []

    low_version = "1.0.0"
    raw_frames = None

    if isinstance(data, list):
        raw_frames = data
    elif isinstance(data, dict):
        low_version = str(data.get("lowVersion") or "1.0.0")
        if "document" in data and isinstance(data["document"], dict) and "frames" in data["document"]:
            raw_frames = data["document"]["frames"]
        elif "frames" in data and isinstance(data["frames"], list):
            raw_frames = data["frames"]

    if raw_frames is None:
        return False, low_version, [], ["Missing frames array in document"], []

    if not isinstance(raw_frames, list):
        return False, low_version, [], ["Frames must be an array"], []

    if len(raw_frames) == 0:
        return False, low_version, [], ["Document must contain at least one screen/frame"], []

    normalized_frames: List[Dict[str, Any]] = []
    for idx, f in enumerate(raw_frames):
        try:
            norm = normalize_frame(f, idx)
            normalized_frames.append(norm)
        except ValueError as e:
            errors.append(str(e))

    if errors:
        return False, low_version, [], errors, warnings

    return True, low_version, normalized_frames, [], warnings


async def import_low_json(session: AsyncSession, project: Project, data: Any) -> Document:
    is_valid, low_ver, normalized_frames, errors, _ = validate_and_normalize_low_data(data)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"message": "Invalid LOW JSON document", "errors": errors})

    doc = await get_or_create_document(session, project)

    # Save backup snapshot of existing document before replacing
    await create_document_version(session, doc, reason="pre-import backup")

    new_content = {
        "id": project.id,
        "name": project.name,
        "frames": normalized_frames,
    }

    if isinstance(data, dict):
        if "designTokens" in data and isinstance(data["designTokens"], dict):
            new_content["designTokens"] = data["designTokens"]
        elif "document" in data and isinstance(data["document"], dict) and "designTokens" in data["document"]:
            new_content["designTokens"] = data["document"]["designTokens"]
        if "components" in data and isinstance(data["components"], list):
            new_content["components"] = data["components"]
        elif "document" in data and isinstance(data["document"], dict) and "components" in data["document"]:
            new_content["components"] = data["document"]["components"]

    doc.content_json = json.dumps(new_content)
    doc.low_version = low_ver
    doc.revision += 1
    await session.commit()
    await session.refresh(doc)
    return doc


async def export_low_json(session: AsyncSession, project: Project) -> Dict[str, Any]:
    doc = await get_or_create_document(session, project)
    content = json.loads(doc.content_json)
    frames = content.get("frames", [])

    res = {
        "lowVersion": doc.low_version or "1.0.0",
        "document": {
            "id": project.id,
            "name": project.name,
            "frames": frames,
        },
    }

    if "designTokens" in content:
        res["designTokens"] = content["designTokens"]
        res["document"]["designTokens"] = content["designTokens"]
    if "components" in content:
        res["components"] = content["components"]
        res["document"]["components"] = content["components"]

    return res
