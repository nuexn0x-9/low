import json
import io
import zipfile
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.project import Project
from app.schemas.document import ValidateImportRequest, ValidateImportResponse
from app.api.deps import get_current_user_optional
from app.services.import_service import (
    validate_and_normalize_low_data,
    import_low_json,
    export_low_json,
)

router = APIRouter(tags=["import-export"])


@router.post("/import/low-json/validate", response_model=ValidateImportResponse)
async def validate_import(payload: ValidateImportRequest):
    data = payload.data if payload.data is not None else payload.json_string
    if data is None:
        raise HTTPException(status_code=400, detail="Missing data or json_string")

    valid, low_ver, frames, errors, warnings = validate_and_normalize_low_data(data)

    total_nodes = sum(len(f.get("nodes", [])) for f in frames) if valid else 0
    return ValidateImportResponse(
        valid=valid,
        low_version=low_ver,
        screens_count=len(frames),
        total_nodes=total_nodes,
        errors=errors,
        warnings=warnings,
    )


@router.post("/projects/{project_id}/import/low-json")
async def import_into_project(
    project_id: str,
    request: Request,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    body = await request.json()
    doc = await import_low_json(db, project, body)
    return {
        "status": "ok",
        "message": "Document imported successfully",
        "revision": doc.revision,
        "low_version": doc.low_version,
    }


@router.get("/projects/{project_id}/export/low-json")
async def export_project(
    project_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    export_data = await export_low_json(db, project)
    return export_data


DEFAULT_DESIGN_TOKENS = {
    "colors": {
        "background": "#ffffff",
        "foreground": "#18181b",
        "muted": "#71717a",
        "border": "#d4d4d8",
        "surface": "#f4f4f5",
        "primary": "#18181b",
        "secondary": "#f4f4f5",
    },
    "radius": {
        "none": 0,
        "sm": 4,
        "md": 8,
        "lg": 12,
        "xl": 16,
        "full": 9999,
    },
    "spacing": {
        "xs": 4,
        "sm": 8,
        "md": 16,
        "lg": 24,
        "xl": 32,
    },
}


def generate_tokens_css(tokens: dict) -> str:
    tokens_to_use = tokens if tokens else DEFAULT_DESIGN_TOKENS
    lines = [":root {"]
    colors = tokens_to_use.get("colors", {})
    if isinstance(colors, dict):
        lines.append("  /* Colors */")
        for k, v in colors.items():
            lines.append(f"  --low-color-{k}: {v};")
    radius = tokens_to_use.get("radius", {})
    if isinstance(radius, dict):
        lines.append("  /* Border Radius */")
        for k, v in radius.items():
            lines.append(f"  --low-radius-{k}: {v}px;")
    spacing = tokens_to_use.get("spacing", {})
    if isinstance(spacing, dict):
        lines.append("  /* Spacing */")
        for k, v in spacing.items():
            lines.append(f"  --low-spacing-{k}: {v}px;")
    lines.append("}")
    return "\n".join(lines)


def create_standalone_prototype_html(project_name: str, export_data: dict) -> str:
    escaped_json = json.dumps(export_data).replace("</script>", "<\\/script>")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LOW Prototype - {project_name}</title>
  <!-- LOW Standalone Mobile Prototype Viewer -->
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; user-select: none; }}
    body {{ background: #09090b; color: #18181b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; }}
    #header {{ margin-bottom: 16px; color: #a1a1aa; font-size: 13px; display: flex; align-items: center; gap: 12px; }}
    #device-shell {{ position: relative; background: #ffffff; border-radius: 36px; border: 8px solid #27272a; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden; }}
    .screen {{ position: absolute; inset: 0; display: none; overflow: hidden; background: #ffffff; }}
    .screen.active {{ display: block; }}
    .node {{ position: absolute; box-sizing: border-box; }}
    .node.clickable {{ cursor: pointer; transition: opacity 0.15s ease; }}
    .node.clickable:active {{ opacity: 0.7; }}
    #overlay-backdrop {{ position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; display: none; align-items: flex-end; justify-content: center; }}
    #overlay-backdrop.active {{ display: flex; }}
    #overlay-content {{ width: 100%; max-height: 80%; background: #ffffff; border-radius: 20px 20px 0 0; padding: 16px; position: relative; overflow: auto; }}
    #controls {{ margin-top: 16px; display: flex; gap: 8px; }}
    button {{ background: #27272a; color: #fafafa; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }}
    button:hover {{ background: #3f3f46; }}
  </style>
</head>
<body>
  <div id="header">
    <strong id="title">{project_name}</strong>
    <span id="screen-title">—</span>
  </div>
  <div id="device-shell">
    <div id="viewport" style="position: relative; width: 100%; height: 100%;"></div>
    <div id="overlay-backdrop">
      <div id="overlay-content"></div>
    </div>
  </div>
  <div id="controls">
    <button onclick="goBack()">Back</button>
    <button onclick="restart()">Restart</button>
  </div>
  <script>
    const DATA = {escaped_json};
    const frames = DATA.document?.frames || DATA.frames || [];
    let historyStack = [];
    let currentFrame = null;

    function renderNode(node, allNodes) {{
      if (node.hidden) return null;
      const el = document.createElement("div");
      el.className = "node" + (node.prototype?.action ? " clickable" : "");
      el.id = node.id;
      const s = node.style || {{}};

      if (node.type === "autoLayout") {{
        el.style.left = (node.x || 0) + "px";
        el.style.top = (node.y || 0) + "px";
        el.style.width = (node.width || 100) + "px";
        el.style.height = (node.height || 100) + "px";
        el.style.display = "flex";
        el.style.flexDirection = node.layout?.direction === "horizontal" ? "row" : "column";
        el.style.gap = (node.layout?.gap ?? 12) + "px";
        const pad = node.layout?.padding || {{ top: 16, right: 16, bottom: 16, left: 16 }};
        el.style.padding = typeof pad === "number" ? pad + "px" : `${{pad.top||0}}px ${{pad.right||0}}px ${{pad.bottom||0}}px ${{pad.left||0}}px`;
        el.style.alignItems = node.layout?.align === "center" ? "center" : node.layout?.align === "end" ? "flex-end" : "stretch";
        el.style.justifyContent = node.layout?.justify === "center" ? "center" : node.layout?.justify === "space-between" ? "space-between" : "flex-start";
        el.style.background = s.fill || "transparent";
        el.style.borderRadius = (s.radius || 8) + "px";
        const children = (node.children || []).map(cid => allNodes.find(n => n.id === cid)).filter(Boolean);
        children.forEach(c => {{
          const childEl = renderNode(c, allNodes);
          if (childEl) {{
            childEl.style.position = "relative";
            childEl.style.left = "0px";
            childEl.style.top = "0px";
            if (c.layoutSizing?.width === "fill") childEl.style.flexGrow = "1";
            if (c.layoutSizing?.height === "fill") childEl.style.flexGrow = "1";
            el.appendChild(childEl);
          }}
        }});
        return el;
      }}

      el.style.left = (node.x || 0) + "px";
      el.style.top = (node.y || 0) + "px";
      el.style.width = (node.width || 100) + "px";
      el.style.height = (node.height || 40) + "px";
      el.style.background = s.fill || "transparent";
      if (s.stroke) el.style.border = `${{s.strokeWidth||1}}px solid ${{s.stroke}}`;
      if (s.radius) el.style.borderRadius = s.radius + "px";
      if (s.opacity !== undefined) el.style.opacity = s.opacity / 100;

      if (node.type === "text" || node.type === "button" || node.type === "input") {{
        el.textContent = node.text || (node.type === "input" ? "Placeholder" : "");
        el.style.color = s.color || (node.type === "button" ? "#ffffff" : "#18181b");
        el.style.fontSize = (s.fontSize || 14) + "px";
        el.style.fontWeight = s.fontWeight || 400;
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = s.textAlign === "center" || node.type === "button" ? "center" : "flex-start";
        if (node.type === "input") el.style.paddingLeft = "12px";
      }}

      if (node.prototype?.action) {{
        el.onclick = (e) => {{
          e.stopPropagation();
          handleAction(node.prototype);
        }};
      }}
      return el;
    }}

    function handleAction(proto) {{
      if (proto.action === "navigate" && proto.target) {{
        const targetFrame = frames.find(f => f.id === proto.target || f.name === proto.target);
        if (targetFrame) showFrame(targetFrame.id);
      }} else if (proto.action === "back") {{
        goBack();
      }} else if (proto.action === "overlay" && proto.target) {{
        const overlayF = frames.find(f => f.id === proto.target || f.name === proto.target);
        if (overlayF) showOverlay(overlayF);
      }}
    }}

    function showFrame(id) {{
      const f = frames.find(fr => fr.id === id);
      if (!f) return;
      if (currentFrame && currentFrame.id !== id) historyStack.push(currentFrame.id);
      currentFrame = f;
      document.getElementById("screen-title").textContent = f.name;
      const vp = document.getElementById("viewport");
      const shell = document.getElementById("device-shell");
      const w = f.width || 390;
      const h = f.height || 844;
      shell.style.width = w + "px";
      shell.style.height = h + "px";
      vp.innerHTML = "";

      const visibleTopNodes = (f.nodes || []).filter(n => !n.parentId && !n.hidden);
      visibleTopNodes.forEach(n => {{
        const el = renderNode(n, f.nodes || []);
        if (el) vp.appendChild(el);
      }});
      closeOverlay();
    }}

    function showOverlay(f) {{
      const b = document.getElementById("overlay-backdrop");
      const c = document.getElementById("overlay-content");
      c.innerHTML = "";
      (f.nodes || []).filter(n => !n.hidden).forEach(n => {{
        const el = renderNode(n, f.nodes || []);
        if (el) c.appendChild(el);
      }});
      b.className = "active";
    }}

    function closeOverlay() {{
      document.getElementById("overlay-backdrop").className = "";
    }}

    document.getElementById("overlay-backdrop").onclick = closeOverlay;

    function goBack() {{
      if (document.getElementById("overlay-backdrop").className === "active") {{
        closeOverlay();
        return;
      }}
      if (historyStack.length > 0) {{
        const prevId = historyStack.pop();
        showFrame(prevId);
      }}
    }}

    function restart() {{
      historyStack = [];
      if (frames.length > 0) showFrame(frames[0].id);
    }}

    if (frames.length > 0) showFrame(frames[0].id);
  </script>
</body>
</html>
"""


@router.get("/projects/{project_id}/export/tokens.json")
async def export_tokens_json(
    project_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    export_data = await export_low_json(db, project)
    tokens = export_data.get("designTokens") or DEFAULT_DESIGN_TOKENS
    return {"status": "ok", "projectId": project.id, "designTokens": tokens}


@router.get("/projects/{project_id}/export/tokens.css")
async def export_tokens_css(
    project_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    export_data = await export_low_json(db, project)
    tokens = export_data.get("designTokens", {})
    css_content = generate_tokens_css(tokens)
    return Response(
        content=css_content,
        media_type="text/css",
        headers={"Content-Disposition": f'attachment; filename="{project.id}_tokens.css"'},
    )


@router.get("/projects/{project_id}/export/prototype.zip")
async def export_prototype_zip(
    project_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).where(
        Project.id == project_id,
        Project.owner_id == user.id,
        Project.deleted_at.is_(None),
    )
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    export_data = await export_low_json(db, project)
    html_content = create_standalone_prototype_html(project.name, export_data)
    json_content = json.dumps(export_data, indent=2)

    import io
    import zipfile

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", html_content)
        z.writestr("low-prototype.json", json_content)
        z.writestr(
            "README.txt",
            f"LOW Interactive Prototype Package\nProject: {project.name}\n\nOpen index.html in any web browser to view and interact with the screens offline.\n",
        )

    buffer.seek(0)
    zip_bytes = buffer.getvalue()
    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in project.name).lower()
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_prototype.zip"'},
    )


@router.post("/export/render/frame")
async def render_frame_preview(request: Request):
    body = await request.json()
    frame = body.get("frame")
    if not frame or not isinstance(frame, dict):
        raise HTTPException(status_code=400, detail="Missing or invalid frame payload")
    nodes = frame.get("nodes", [])
    visible_nodes = [n for n in nodes if not n.get("hidden")]
    return {
        "status": "ok",
        "frameId": frame.get("id"),
        "name": frame.get("name", "Screen"),
        "width": frame.get("width", 390),
        "height": frame.get("height", 844),
        "visibleNodesCount": len(visible_nodes),
    }


@router.post("/export/render/selection")
async def render_selection_preview(request: Request):
    body = await request.json()
    nodes = body.get("nodes")
    if not isinstance(nodes, list):
        raise HTTPException(status_code=400, detail="Missing nodes array")
    visible = [n for n in nodes if not n.get("hidden")]
    if not visible:
        return {"status": "ok", "width": 0, "height": 0, "count": 0}
    min_x = min(float(n.get("x", 0)) for n in visible)
    min_y = min(float(n.get("y", 0)) for n in visible)
    max_x = max(float(n.get("x", 0)) + float(n.get("width", 0)) for n in visible)
    max_y = max(float(n.get("y", 0)) + float(n.get("height", 0)) for n in visible)
    return {
        "status": "ok",
        "count": len(visible),
        "bounds": {
            "x": round(min_x),
            "y": round(min_y),
            "width": round(max(1, max_x - min_x)),
            "height": round(max(1, max_y - min_y)),
        },
    }
