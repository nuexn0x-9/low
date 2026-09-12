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
    "autolayout",
    "autoLayout",
    "scrollarea",
    "scrollArea",
}


ALLOWED_PROTOTYPE_ACTIONS = {"none", "navigate", "back", "overlay"}
ALLOWED_OVERLAY_TYPES = {"bottom-sheet", "centered-dialog"}

ALLOWED_AUTO_LAYOUT_DIRECTIONS = {"vertical", "horizontal"}
ALLOWED_AUTO_LAYOUT_ALIGN = {"start", "center", "end", "stretch"}
ALLOWED_AUTO_LAYOUT_JUSTIFY = {"start", "center", "end", "space-between"}
ALLOWED_LAYOUT_SIZING = {"fixed", "fill", "hug"}
ALLOWED_CONSTRAINTS_HORIZONTAL = {"left", "right", "left-right", "center", "scale"}
ALLOWED_CONSTRAINTS_VERTICAL = {"top", "bottom", "top-bottom", "center", "scale"}
ALLOWED_SCROLL_DIRECTIONS = {"vertical", "horizontal", "both"}
ALLOWED_FRAME_PRESETS = {"iPhone 15", "iPhone SE", "Android Compact", "Android Large", "Custom Size"}

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
            errors.append(f"Frame at index {f_idx} is not an object")
            continue

        f_name = sanitize_text(f.get("name") or f"Screen {f_idx + 1}")
        f_id = str(f.get("id") or _gen_id("frame"))

        preset = str(f.get("preset", "iPhone 15"))
        if preset not in ALLOWED_FRAME_PRESETS:
            preset = "iPhone 15"

        try:
            f_w = float(f.get("width", 390))
            f_h = float(f.get("height", 844))
        except (ValueError, TypeError):
            f_w, f_h = 390, 844

        guarded_frame: Dict[str, Any] = {
            "id": f_id,
            "name": f_name,
            "preset": preset,
            "width": round(f_w),
            "height": round(f_h),
        }

        if "safeArea" in f and isinstance(f["safeArea"], dict):
            raw_sa = f["safeArea"]
            guarded_frame["safeArea"] = {
                "top": max(0.0, float(raw_sa.get("top", 0))),
                "right": max(0.0, float(raw_sa.get("right", 0))),
                "bottom": max(0.0, float(raw_sa.get("bottom", 0))),
                "left": max(0.0, float(raw_sa.get("left", 0))),
                "visible": bool(raw_sa.get("visible", True)),
            }

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

            raw_type = str(n.get("type", "rectangle")).strip()
            # Normalize casing for autoLayout and scrollArea
            if raw_type.lower() == "autolayout":
                n_type = "autoLayout"
            elif raw_type.lower() == "scrollarea":
                n_type = "scrollArea"
            elif raw_type.lower() == "componentinstance":
                n_type = "componentInstance"
            else:
                n_type = raw_type.lower()

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

            if x < 0 or x + width > 460 or y < 0 or y + height > 1200:
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

            if "parentId" in n and n["parentId"]:
                guarded_node["parentId"] = str(n["parentId"])

            # Responsive Constraints
            if "constraints" in n and isinstance(n["constraints"], dict):
                h_c = str(n["constraints"].get("horizontal", "left")).lower()
                v_c = str(n["constraints"].get("vertical", "top")).lower()
                guarded_node["constraints"] = {
                    "horizontal": h_c if h_c in ALLOWED_CONSTRAINTS_HORIZONTAL else "left",
                    "vertical": v_c if v_c in ALLOWED_CONSTRAINTS_VERTICAL else "top",
                }

            # Layout Sizing
            if "layoutSizing" in n and isinstance(n["layoutSizing"], dict):
                w_s = str(n["layoutSizing"].get("width", "fixed")).lower()
                h_s = str(n["layoutSizing"].get("height", "fixed")).lower()
                guarded_node["layoutSizing"] = {
                    "width": w_s if w_s in ALLOWED_LAYOUT_SIZING else "fixed",
                    "height": h_s if h_s in ALLOWED_LAYOUT_SIZING else "fixed",
                }

            # AutoLayout container
            if n_type == "autoLayout":
                raw_children = n.get("children", [])
                if isinstance(raw_children, list):
                    guarded_node["children"] = [str(c) for c in raw_children if str(c) != n_id]
                else:
                    guarded_node["children"] = []

                raw_layout = n.get("layout", {})
                if not isinstance(raw_layout, dict):
                    raw_layout = {}
                direction = str(raw_layout.get("direction", "vertical")).lower()
                if direction not in ALLOWED_AUTO_LAYOUT_DIRECTIONS:
                    direction = "vertical"

                try:
                    gap = max(0.0, float(raw_layout.get("gap", 0)))
                except (ValueError, TypeError):
                    gap = 0.0

                raw_p = raw_layout.get("padding", {})
                if isinstance(raw_p, (int, float)):
                    val = max(0.0, float(raw_p))
                    padding = {"top": val, "right": val, "bottom": val, "left": val}
                elif isinstance(raw_p, dict):
                    padding = {
                        "top": max(0.0, float(raw_p.get("top", 0))),
                        "right": max(0.0, float(raw_p.get("right", 0))),
                        "bottom": max(0.0, float(raw_p.get("bottom", 0))),
                        "left": max(0.0, float(raw_p.get("left", 0))),
                    }
                else:
                    padding = {"top": 0.0, "right": 0.0, "bottom": 0.0, "left": 0.0}

                align = str(raw_layout.get("align", "stretch")).lower()
                if align not in ALLOWED_AUTO_LAYOUT_ALIGN:
                    align = "stretch"

                justify = str(raw_layout.get("justify", "start")).lower()
                if justify not in ALLOWED_AUTO_LAYOUT_JUSTIFY:
                    justify = "start"

                wrap = bool(raw_layout.get("wrap", False))

                guarded_node["layout"] = {
                    "direction": direction,
                    "gap": gap,
                    "padding": padding,
                    "align": align,
                    "justify": justify,
                    "wrap": wrap,
                }

            # ScrollArea container
            if n_type == "scrollArea":
                raw_children = n.get("children", [])
                if isinstance(raw_children, list):
                    guarded_node["children"] = [str(c) for c in raw_children if str(c) != n_id]
                else:
                    guarded_node["children"] = []

                raw_scroll = n.get("scroll", {})
                if not isinstance(raw_scroll, dict):
                    raw_scroll = {}
                s_dir = str(raw_scroll.get("direction", "vertical")).lower()
                if s_dir not in ALLOWED_SCROLL_DIRECTIONS:
                    s_dir = "vertical"

                try:
                    cH = max(0.0, float(raw_scroll.get("contentHeight", height)))
                    cW = max(0.0, float(raw_scroll.get("contentWidth", width)))
                except (ValueError, TypeError):
                    cH, cW = height, width

                guarded_node["scroll"] = {
                    "direction": s_dir,
                    "contentHeight": cH,
                    "contentWidth": cW,
                    "showIndicator": bool(raw_scroll.get("showIndicator", True)),
                }

            if n_type == "componentInstance":
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

        guarded_frame["nodes"] = guarded_nodes
        guarded_frames.append(guarded_frame)

    if errors:
        return False, {}, errors, warnings

    return True, {"frames": guarded_frames}, [], warnings
