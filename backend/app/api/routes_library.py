import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.models.user import User
from app.models.library import Component, Template, generate_component_id, generate_template_id
from app.models.base import utc_now
from app.schemas.library import (
    ComponentCreate,
    ComponentUpdate,
    ComponentOut,
    TemplateCreate,
    TemplateUpdate,
    TemplateOut,
)
from app.api.deps import get_current_user_optional

router = APIRouter(tags=["library"])


# ============================================================
# Components API
# ============================================================

@router.get("/components", response_model=List[ComponentOut])
async def list_components(
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Component).where(
        or_(
            Component.owner_id.is_(None),
            Component.owner_id == user.id,
            Component.owner_id == "usr_default",
        )
    ).order_by(Component.name.asc())

    res = await db.execute(stmt)
    components = res.scalars().all()

    out = []
    for c in components:
        content = {}
        try:
            content = json.loads(c.content_json)
        except Exception:
            pass
        out.append(
            ComponentOut(
                id=c.id,
                owner_id=c.owner_id,
                project_id=c.project_id,
                name=c.name,
                category=c.category,
                content=content,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )
    return out


@router.post("/components", response_model=ComponentOut, status_code=status.HTTP_201_CREATED)
async def create_component(
    payload: ComponentCreate,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    comp = Component(
        id=generate_component_id(),
        owner_id=user.id,
        project_id=payload.project_id,
        name=payload.name,
        category=payload.category,
        content_json=json.dumps(payload.content),
    )
    db.add(comp)
    await db.commit()
    await db.refresh(comp)

    return ComponentOut(
        id=comp.id,
        owner_id=comp.owner_id,
        project_id=comp.project_id,
        name=comp.name,
        category=comp.category,
        content=payload.content,
        created_at=comp.created_at,
        updated_at=comp.updated_at,
    )


@router.get("/components/{component_id}", response_model=ComponentOut)
async def get_component(
    component_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Component).where(Component.id == component_id)
    res = await db.execute(stmt)
    comp = res.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    content = {}
    try:
        content = json.loads(comp.content_json)
    except Exception:
        pass

    return ComponentOut(
        id=comp.id,
        owner_id=comp.owner_id,
        project_id=comp.project_id,
        name=comp.name,
        category=comp.category,
        content=content,
        created_at=comp.created_at,
        updated_at=comp.updated_at,
    )


@router.patch("/components/{component_id}", response_model=ComponentOut)
async def update_component(
    component_id: str,
    payload: ComponentUpdate,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Component).where(Component.id == component_id)
    res = await db.execute(stmt)
    comp = res.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    if comp.owner_id and comp.owner_id != user.id and comp.owner_id != "usr_default":
        raise HTTPException(status_code=403, detail="Not authorized to edit this component")

    if payload.name is not None:
        comp.name = payload.name
    if payload.category is not None:
        comp.category = payload.category
    if payload.content is not None:
        comp.content_json = json.dumps(payload.content)

    comp.updated_at = utc_now()
    await db.commit()
    await db.refresh(comp)

    content = {}
    try:
        content = json.loads(comp.content_json)
    except Exception:
        pass

    return ComponentOut(
        id=comp.id,
        owner_id=comp.owner_id,
        project_id=comp.project_id,
        name=comp.name,
        category=comp.category,
        content=content,
        created_at=comp.created_at,
        updated_at=comp.updated_at,
    )


@router.delete("/components/{component_id}")
async def delete_component(
    component_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Component).where(Component.id == component_id)
    res = await db.execute(stmt)
    comp = res.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    if comp.owner_id and comp.owner_id != user.id and comp.owner_id != "usr_default":
        raise HTTPException(status_code=403, detail="Not authorized to delete this component")

    await db.delete(comp)
    await db.commit()
    return {"status": "success", "message": "Component deleted"}


@router.post("/components/{component_id}/detach")
async def detach_component(
    component_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Component).where(Component.id == component_id)
    res = await db.execute(stmt)
    comp = res.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    content = {}
    try:
        content = json.loads(comp.content_json)
    except Exception:
        pass

    nodes = []
    if isinstance(content, list):
        nodes = content
    elif isinstance(content, dict):
        if "nodes" in content and isinstance(content["nodes"], list):
            nodes = content["nodes"]
        else:
            nodes = [content]

    return {
        "status": "success",
        "component_id": component_id,
        "name": comp.name,
        "nodes": nodes,
    }


# ============================================================
# Templates API
# ============================================================

@router.get("/templates", response_model=List[TemplateOut])
async def list_templates(
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Template).where(
        or_(
            Template.is_builtin.is_(True),
            Template.owner_id.is_(None),
            Template.owner_id == user.id,
            Template.owner_id == "usr_default",
        )
    ).order_by(Template.is_builtin.desc(), Template.name.asc())

    res = await db.execute(stmt)
    templates = res.scalars().all()

    out = []
    for t in templates:
        content = []
        try:
            content = json.loads(t.content_json)
        except Exception:
            pass
        out.append(
            TemplateOut(
                id=t.id,
                owner_id=t.owner_id,
                name=t.name,
                category=t.category,
                content=content,
                is_builtin=t.is_builtin,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
        )
    return out


@router.post("/templates", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: TemplateCreate,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    tpl = Template(
        id=generate_template_id(),
        owner_id=user.id,
        name=payload.name,
        category=payload.category,
        content_json=json.dumps(payload.content),
        is_builtin=False,
    )
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)

    return TemplateOut(
        id=tpl.id,
        owner_id=tpl.owner_id,
        name=tpl.name,
        category=tpl.category,
        content=payload.content,
        is_builtin=tpl.is_builtin,
        created_at=tpl.created_at,
        updated_at=tpl.updated_at,
    )


@router.get("/templates/{template_id}", response_model=TemplateOut)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Template).where(Template.id == template_id)
    res = await db.execute(stmt)
    tpl = res.scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    content = []
    try:
        content = json.loads(tpl.content_json)
    except Exception:
        pass

    return TemplateOut(
        id=tpl.id,
        owner_id=tpl.owner_id,
        name=tpl.name,
        category=tpl.category,
        content=content,
        is_builtin=tpl.is_builtin,
        created_at=tpl.created_at,
        updated_at=tpl.updated_at,
    )


@router.patch("/templates/{template_id}", response_model=TemplateOut)
async def update_template(
    template_id: str,
    payload: TemplateUpdate,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Template).where(Template.id == template_id)
    res = await db.execute(stmt)
    tpl = res.scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    if tpl.is_builtin:
        raise HTTPException(status_code=403, detail="Cannot modify built-in template")

    if tpl.owner_id and tpl.owner_id != user.id and tpl.owner_id != "usr_default":
        raise HTTPException(status_code=403, detail="Not authorized to edit this template")

    if payload.name is not None:
        tpl.name = payload.name
    if payload.category is not None:
        tpl.category = payload.category
    if payload.content is not None:
        tpl.content_json = json.dumps(payload.content)

    tpl.updated_at = utc_now()
    await db.commit()
    await db.refresh(tpl)

    content = []
    try:
        content = json.loads(tpl.content_json)
    except Exception:
        pass

    return TemplateOut(
        id=tpl.id,
        owner_id=tpl.owner_id,
        name=tpl.name,
        category=tpl.category,
        content=content,
        is_builtin=tpl.is_builtin,
        created_at=tpl.created_at,
        updated_at=tpl.updated_at,
    )


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Template).where(Template.id == template_id)
    res = await db.execute(stmt)
    tpl = res.scalar_one_or_none()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    if tpl.is_builtin:
        raise HTTPException(status_code=403, detail="Cannot delete built-in template")

    if tpl.owner_id and tpl.owner_id != user.id and tpl.owner_id != "usr_default":
        raise HTTPException(status_code=403, detail="Not authorized to delete this template")

    await db.delete(tpl)
    await db.commit()
    return {"status": "ok", "message": "Template deleted"}
