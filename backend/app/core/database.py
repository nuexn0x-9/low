import json
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.security import hash_password
from app.models.base import Base
from app.models.user import User
from app.models.library import Component, Template


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


BUILTIN_COMPONENTS = [
    {
        "id": "c_button",
        "name": "Button",
        "category": "primitives",
        "content_json": json.dumps({
            "type": "button",
            "name": "Button",
            "width": 200,
            "height": 48,
            "text": "Button",
            "style": {"fill": "#18181b", "radius": 10, "color": "#ffffff", "fontSize": 15, "fontWeight": 600, "align": "center", "opacity": 100},
        }),
    },
    {
        "id": "c_input",
        "name": "Input",
        "category": "primitives",
        "content_json": json.dumps({
            "type": "input",
            "name": "Input",
            "width": 240,
            "height": 48,
            "text": "Placeholder",
            "style": {"fill": "#ffffff", "stroke": "#d4d4d8", "strokeWidth": 1, "radius": 10, "color": "#a1a1aa", "fontSize": 14, "opacity": 100},
        }),
    },
    {
        "id": "c_card",
        "name": "Card",
        "category": "containers",
        "content_json": json.dumps({
            "type": "rectangle",
            "name": "Card",
            "width": 240,
            "height": 120,
            "text": "",
            "style": {"fill": "#f4f4f5", "stroke": "#e4e4e7", "strokeWidth": 1, "radius": 12, "opacity": 100},
        }),
    },
    {
        "id": "c_nav",
        "name": "Bottom Navigation",
        "category": "navigation",
        "content_json": json.dumps({
            "type": "bottomnav",
            "name": "Bottom Navigation",
            "width": 390,
            "height": 64,
            "text": "",
            "style": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1, "opacity": 100},
        }),
    },
    {
        "id": "c_sheet",
        "name": "Bottom Sheet",
        "category": "containers",
        "content_json": json.dumps({
            "type": "rectangle",
            "name": "Bottom Sheet",
            "width": 342,
            "height": 220,
            "text": "",
            "style": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1, "radius": 16, "opacity": 100},
        }),
    },
    {
        "id": "c_appbar",
        "name": "App Bar",
        "category": "navigation",
        "content_json": json.dumps({
            "type": "rectangle",
            "name": "App Bar",
            "width": 390,
            "height": 56,
            "text": "",
            "style": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1, "radius": 0, "opacity": 100},
        }),
    },
]

BUILTIN_TEMPLATES = [
    {
        "id": "t_login",
        "name": "Login",
        "category": "screens",
        "is_builtin": True,
        "content_json": json.dumps([
            {"id": "n_title", "type": "text", "name": "Title", "x": 24, "y": 96, "width": 300, "height": 40, "text": "Welcome back", "style": {"color": "#18181b", "fontSize": 26, "fontWeight": 700, "align": "left", "opacity": 100}},
            {"id": "n_sub", "type": "text", "name": "Subtitle", "x": 24, "y": 140, "width": 320, "height": 22, "text": "Sign in to continue to LOW", "style": {"color": "#71717a", "fontSize": 14, "fontWeight": 400, "align": "left", "opacity": 100}},
            {"id": "n_phone", "type": "input", "name": "Phone Input", "x": 24, "y": 204, "width": 342, "height": 48, "text": "Phone number", "style": {"fill": "#ffffff", "stroke": "#d4d4d8", "strokeWidth": 1, "radius": 10, "color": "#a1a1aa", "fontSize": 14, "opacity": 100}},
            {"id": "n_pass", "type": "input", "name": "Password Input", "x": 24, "y": 264, "width": 342, "height": 48, "text": "Password", "style": {"fill": "#ffffff", "stroke": "#d4d4d8", "strokeWidth": 1, "radius": 10, "color": "#a1a1aa", "fontSize": 14, "opacity": 100}},
            {"id": "n_btn", "type": "button", "name": "Login Button", "x": 24, "y": 376, "width": 342, "height": 50, "text": "Sign In", "style": {"fill": "#18181b", "radius": 10, "color": "#ffffff", "fontSize": 15, "fontWeight": 600, "align": "center", "opacity": 100}},
            {"id": "n_nav", "type": "bottomnav", "name": "Bottom Navigation", "x": 0, "y": 780, "width": 390, "height": 64, "text": "", "style": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1, "opacity": 100}},
        ]),
    },
    {
        "id": "t_register",
        "name": "Register",
        "category": "screens",
        "is_builtin": True,
        "content_json": json.dumps([
            {"id": "n_rtitle", "type": "text", "name": "Title", "x": 24, "y": 96, "width": 320, "height": 40, "text": "Create account", "style": {"color": "#18181b", "fontSize": 26, "fontWeight": 700, "align": "left", "opacity": 100}},
            {"id": "n_rname", "type": "input", "name": "Full Name", "x": 24, "y": 180, "width": 342, "height": 48, "text": "Full name", "style": {"fill": "#ffffff", "stroke": "#d4d4d8", "strokeWidth": 1, "radius": 10, "color": "#a1a1aa", "fontSize": 14, "opacity": 100}},
            {"id": "n_remail", "type": "input", "name": "Email", "x": 24, "y": 240, "width": 342, "height": 48, "text": "Email address", "style": {"fill": "#ffffff", "stroke": "#d4d4d8", "strokeWidth": 1, "radius": 10, "color": "#a1a1aa", "fontSize": 14, "opacity": 100}},
            {"id": "n_rpass", "type": "input", "name": "Password", "x": 24, "y": 300, "width": 342, "height": 48, "text": "Password", "style": {"fill": "#ffffff", "stroke": "#d4d4d8", "strokeWidth": 1, "radius": 10, "color": "#a1a1aa", "fontSize": 14, "opacity": 100}},
            {"id": "n_rbtn", "type": "button", "name": "Register Button", "x": 24, "y": 372, "width": 342, "height": 50, "text": "Create account", "style": {"fill": "#18181b", "radius": 10, "color": "#ffffff", "fontSize": 15, "fontWeight": 600, "align": "center", "opacity": 100}},
        ]),
    },
    {
        "id": "t_home",
        "name": "Home",
        "category": "screens",
        "is_builtin": True,
        "content_json": json.dumps([
            {"id": "n_hbar", "type": "text", "name": "App Bar", "x": 24, "y": 52, "width": 200, "height": 28, "text": "Home", "style": {"color": "#18181b", "fontSize": 20, "fontWeight": 700, "align": "left", "opacity": 100}},
            {"id": "n_hc1", "type": "rectangle", "name": "Card 1", "x": 24, "y": 100, "width": 342, "height": 120, "text": "", "style": {"fill": "#f4f4f5", "stroke": "#e4e4e7", "strokeWidth": 1, "radius": 12, "opacity": 100}},
            {"id": "n_hc2", "type": "rectangle", "name": "Card 2", "x": 24, "y": 236, "width": 342, "height": 120, "text": "", "style": {"fill": "#f4f4f5", "stroke": "#e4e4e7", "strokeWidth": 1, "radius": 12, "opacity": 100}},
            {"id": "n_hnav", "type": "bottomnav", "name": "Bottom Navigation", "x": 0, "y": 780, "width": 390, "height": 64, "text": "", "style": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1, "opacity": 100}},
        ]),
    },
]


async def seed_database(session: AsyncSession) -> None:
    # Seed default local user for dev / offline mode
    stmt = select(User).where(User.id == "usr_default")
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            id="usr_default",
            email="local@low.design",
            name="Local Designer",
            password_hash=hash_password("localpassword123"),
        )
        session.add(user)

    # Seed builtin components
    for comp_data in BUILTIN_COMPONENTS:
        c_stmt = select(Component).where(Component.id == comp_data["id"])
        c_res = await session.execute(c_stmt)
        if not c_res.scalar_one_or_none():
            session.add(Component(
                id=comp_data["id"],
                owner_id="usr_default",
                name=comp_data["name"],
                category=comp_data["category"],
                content_json=comp_data["content_json"],
            ))

    # Seed builtin templates
    for tpl_data in BUILTIN_TEMPLATES:
        t_stmt = select(Template).where(Template.id == tpl_data["id"])
        t_res = await session.execute(t_stmt)
        if not t_res.scalar_one_or_none():
            session.add(Template(
                id=tpl_data["id"],
                owner_id=None,
                name=tpl_data["name"],
                category=tpl_data["category"],
                content_json=tpl_data["content_json"],
                is_builtin=True,
            ))

    await session.commit()


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await seed_database(session)
