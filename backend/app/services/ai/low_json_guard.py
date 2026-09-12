import json
import re
import uuid
from typing import Dict, Any, List, Tuple

ALLOWED_NODE_TYPES = {
    "rectangle",
    "text",
    "image",
    "component",
    "button",
    "input",
    "bottomnav",
    "group",
    "componentinstance",
    "componentInstance",
}


ALLOWED_PROTOTYPE_ACTIONS = {"none", "navigate", "back", "overlay"}
ALLOWED_OVERLAY_TYPES = {"bottom-sheet", "centered-dialog"}

MAX_FRAMES = 5
MAX_NODES_PER_FRAME = 80
MAX_PAYLOAD_BYTES = 1024 * 1024  # 1 MB


def _gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def sanitize_text(text: Any) -> str:
    if not isinstance(text, str):
        return "" if text is None else str(text)
    cleaned = re.sub(r"<script.*?>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    return cleaned.strip()


def validate_and_guard_ai_patch(
    raw_patch: Any,
    result_type: str = "screen",
) -> Tuple[bool, Dict[str, Any], List[str], List[str]]:
    errors: List[str] = []
    warnings: List[str] = []

    if isinstance(raw_patch, str):
        if len(raw_patch.encode("utf-8")) > MAX_PAYLOAD_BYTES:
            return False, {}, ["AI payload exceeds maximum size of 1 MB"], []
        try:
            raw_patch = json.loads(raw_patch)
        except Exception as e:
            return False, {}, [f"Invalid JSON structure from AI: {str(e)}"], []

    if not isinstance(raw_patch, dict):
        return False, {}, ["AI patch must be a JSON object"], []

    raw_str = json.dumps(raw_patch)
    if len(raw_str.encode("utf-8")) > MAX_PAYLOAD_BYTES:
        return False, {}, ["AI payload exceeds maximum size of 1 MB"], []

    raw_frames = raw_patch.get("frames", [])
    if not isinstance(raw_frames, list):
        return False, {}, ["'frames' must be an array"], []

    if len(raw_frames) == 0:
        return False, {}, ["AI output must contain at least one frame/screen"], []

    if len(raw_frames) > MAX_FRAMES:
        return False, {}, [f"AI output exceeds maximum of {MAX_FRAMES} frames per generation"], []

    guarded_frames: List[Dict[str, Any]] = []

    for f_idx, f in enumerate(raw_frames):
        if not isinstance(f, dict):
            errors.append(f"Frame at index {u_idx} is not an object")
            continue

        f_name = sanitize_text(f.get("name") or f"Screen {f_idx + 1}")
        f_id = str(f.get("id") or _gen_id("frame"))

        raw_nodes = f.get("nodes", [])
        if not isinstance(raw_nodes, list):
            errors.append(f"Frame '{f_name}' nodes must be an array")
            continue

        if len(raw_nodes) > MAX_NODES_PER_FRAME:
            errors.append(f"Frame '{f_name}' exceeds maximum limit of {MAX_NODES_PER_FRAME} nodes")
            continue

        guarded_nodes: List[Dict[str, Any]] = []

        for node_idx, n in enumerate(raw_nodes):
            if not isinstance(n, dict):
                errors.append(f"Node at index {node_idx} in frame '{f_name}' is not an object")
                continue

            n_type = str(n.get("type", "rectangle")).lower().strip()
            if n_type not in ALLOWED_NODE_TYPES:
                errors.append(
                    f"Node '{n.get('name', node_idx)}' in frame '{f_name}' has unsupported type '{n_type}'."
                )
                continue

            n_name = sanitize_text(n.get("name") or n_type.title())
            n_id = str(n.get("id") or _gen_id(n_type))

            try:
                x = float(n.get("x", 0))
                y = float(n.get("y", 0))
                width = float(n.get("width", 100))
                height = float(n.get("height", 40))
            except (TypeError, ValueError):
                errors.append(f"Node '{n_name}' in frame '{f_name}' has non-numeric coordinates/dimensions")
                continue

            if width <= 0 or height <= 0:
                errors.append(f"Node '{n_name}' in frame '{f_name}' must have positive width and height")
                continue

            if x < 0 or x + width > 420 or y < 0 or y + height > 900:
                warnings.append(f"Node '{n_name}' partially extends outside normal mobile canvas boundaries")

            raw_style = n.get("style", {})
            style: Dict[str, Any] = {}
            if isinstance(raw_style, dict):
                for k, v in raw_style.items():
                    if k in ("fill", "stroke", "color", "fontFamily", "textTransform", "textDecoration"):
                        style[k] = sanitize_text(v)
                    elif k in ("strokeWidth", "radius", "opacity", "fontSize", "fontWeight", "lineHeight", "letterSpacing"):
                        try:
                            style[k] = float(v)
                        except (ValueError, TypeError):
                            pass
                    elif k in ("align", "textAlign") and v in ("left", "center", "right"):
                        style[k] = v


            guarded_node: Dict[str, Any] = {
                "id": n_id,
                "type": n_type,
                "name": n_name,
                "x": round(x),
                "y": round(y),
                "width": round(width),
                "height": round(height),
                "text": sanitize_text(n.get("text", "")),
                "style": style,
            }

            if n_type in ("componentinstance", "componentinstance"):
                guarded_node["type"] = "componentInstance"
                comp_id = n.get("componentId")
                if not comp_id or not isinstance(comp_id, str):
                    errors.append(f"Node '{n_name}' of type 'componentInstance' missing componentId")
                    continue
                guarded_node["componentId"] = str(comp_id).strip()
                overrides = n.get("overrides", {})
                guarded_node["overrides"] = overrides if isinstance(overrides, dict) else {}

            if n_type == "group":
                raw_children = n.get("children", [])
                if isinstance(raw_children, list):
                    # Filter out self-reference
                    guarded_node["children"] = [str(c) for c in raw_children if str(c) != n_id]
                else:
                    guarded_node["children"] = []

            if "locked" in n:
                guarded_node["locked"] = bool(n.get("locked"))
            if "hidden" in n:
                guarded_node["hidden"] = bool(n.get("hidden"))


            if "prototype" in n and isinstance(n["prototype"], dict):
                proto = n["prototype"]
                action = str(proto.get("action", "none")).lower()
                trigger = str(proto.get("trigger", "tap")).lower()
                if action not in ALLOWED_PROTOTYPE_ACTIONS:
                    errors.append(f"Node '{n_name}' prototype action '{action}' is invalid")
                    continue

                guarded_proto = {
                    "trigger": trigger if trigger in ("none", "tap", "longpress") else "tap",
                    "action": action,
                }
                if proto.get("target"):
                    guarded_proto["target"] = str(proto["target"])
                if proto.get("transition"):
                    guarded_proto["transition"] = str(proto["transition"])
                if action == "overlay":
                    o_type = proto.get("overlayType", "bottom-sheet")
                    if o_type not in ALLOWED_OVERLAY_TYPES:
                        errors.append(f"Node '{n_name}' invalid overlayType '{o_type}'")
                        continue
                    guarded_proto["overlayType"] = o_type
                    guarded_proto["dismissOnOutsideClick"] = proto.get("dismissOnOutsideClick", True)

                guarded_node["prototype"] = guarded_proto

            guarded_nodes.append(guarded_node)

        guarded_frames.append({
            "id": f_id,
            "name": f_name,
            "nodes": guarded_nodes,
        })

    if errors:
        return False, {}, errors, warnings

    return True, {"frames": guarded_frames}, [], warnings
