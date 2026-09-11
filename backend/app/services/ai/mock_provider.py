import uuid
from typing import Dict, Any, Optional, List, Tuple
from app.services.ai.provider_base import BaseAIProvider


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:6]}"


class MockAIProvider(BaseAIProvider):
    provider_name: str = "mock"
    model_name: str = "mock-deterministic"

    async def generate_low_patch(
        self,
        prompt: str,
        result_type: str,
        frame_preset: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
        patch = await self._build_patch(prompt, result_type, frame_preset)
        usage = {
            "prompt_tokens": len(prompt.split()) * 2,
            "completion_tokens": 120,
            "total_tokens": len(prompt.split()) * 2 + 120,
        }
        return patch, usage

    async def _build_patch(
        self,
        prompt: str,
        result_type: str,
        frame_preset: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        p = prompt.lower()

        # 1. Bottom Navigation Component
        if "raw_nav" in p or "bottom nav" in p or "bottomnav" in p or "navigation" in p or result_type == "component" and "nav" in p:
            return {
                "frames": [
                    {
                        "id": _uid("frame"),
                        "name": "Bottom Nav Component",
                        "nodes": [
                            {
                                "id": _uid("bottomnav"),
                                "type": "bottomnav",
                                "name": "Bottom Navigation Bar",
                                "x": 0,
                                "y": 780,
                                "width": 390,
                                "height": 64,
                                "style": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1},
                            }
                        ],
                    }
                ]
            }

        # 2. Bottom Sheet Component / Filter Flow
        if "sheet" in p or "filter" in p or "filter produk" in p:
            return {
                "frames": [
                    {
                        "id": _uid("frame"),
                        "name": "Filter Bottom Sheet",
                        "nodes": [
                            {
                                "id": _uid("rectangle"),
                                "type": "rectangle",
                                "name": "Sheet Card",
                                "x": 16, "y": 500,
                                "width": 358,
                                "height": 320,
                                "style": {"fill": "#ffffff", "stroke": "#e4e4e7", "strokeWidth": 1, "radius": 16},
                            },
                            {
                                "id": _uid("text"),
                                "type": "text",
                                "name": "Sheet Title",
                                "x": 32,
                                "y": 530,
                                "width": 180,
                                "height": 28,
                                "text": "Filter Produk",
                                "style": {"color": "#18181b", "fontSize": 18, "fontWeight": 600},
                            },
                            {
                                "id": _uid("button"),
                                "type": "button",
                                "name": "Apply Button",
                                "x": 32,
                                "y": 750,
                                "width": 326,
                                "height": 48,
                                "text": "Terapkan Filter",
                                "style": {"fill": "#18181b", "color": "#ffffff", "radius": 10},
                            },
                        ],
                    }
                ]
            }

        # 3. Onboarding (Keyword: onboarding or 3 screen)
        if "onboarding" in p or "3 screen" in p:
            f1_id = _uid("frame")
            f2_id = _uid("frame")
            f3_id = _uid("frame")
            return {
                "frames": [
                    {
                        "id": f1_id,
                        "name": "Onboarding 1",
                        "nodes": [
                            {
                                "id": _uid("rectangle"),
                                "type": "rectangle",
                                "name": "Illustration 1",
                                "x": 45,
                                "y": 180,
                                "width": 300,
                                "height": 220,
                                "style": {"fill": "#f4f4f5", "stroke": "#e4e4e7", "radius": 16},
                            },
                            {
                                "id": _uid("text"),
                                "type": "text",
                                "name": "Title 1",
                                "x": 24, "y": 440,
                                "width": 342,
                                "height": 32,
                                "text": "Temukan Layanan Terbaik",
                                "style": {"color": "#18181b", "fontSize": 22, "fontWeight": 700},
                            },
                            {
                                "id": _uid("button"),
                                "type": "button",
                                "name": "Next Button",
                                "x": 24,
                                "y": 720,
                                "width": 342,
                                "height": 50,
                                "text": "Lanjut",
                                "style": {"fill": "#18181b", "color": "#ffffff", "radius": 10},
                                "prototype": {"trigger": "tap", "action": "navigate", "target": f2_id, "transition": "slide"},
                            },
                        ],
                    },
                    {
                        "id": f2_id,
                        "name": "Onboarding 2",
                        "nodes": [
                            {
                                "id": _uid("rectangle"),
                                "type": "rectangle",
                                "name": "Illustration 2",
                                "x": 45, "y": 180,
                                "width": 300,
                                "height": 220,
                                "style": {"fill": "#f4f4f5", "stroke": "#e4e4e7", "radius": 16},
                            },
                            {
                                "id": _uid("text"),
                                "type": "text",
                                "name": "Title 2",
                                "x": 24,
                                "y": 440,
                                "width": 342,
                                "height": 32,
                                "text": "Transaksi Aman & Cepat",
                                "style": {"color": "#18181b", "fontSize": 22, "fontWeight": 700},
                            },
                            {
                                "id": _uid("button"),
                                "type": "button",
                                "name": "Next Button 2",
                                "x": 24,
                                "y": 720,
                                "width": 342,
                                "height": 50,
                                "text": "Lanjut",
                                "style": {"fill": "#18181b", "color": "#ffffff", "radius": 10},
                                "prototype": {"trigger": "tap", "action": "navigate", "target": f3_id, "transition": "slide"},
                            },
                        ],
                    },
                    {
                        "id": f3_id,
                        "name": "Onboarding 3",
                        "nodes": [
                            {
                                "id": _uid("rectangle"),
                                "type": "rectangle",
                                "name": "Illustration 3",
                                "x": 45, "y": 180,
                                "width": 300,
                                "height": 220,
                                "style": {"fill": "#f4f4f5", "stroke": "#e4e4e7", "radius": 16},
                            },
                            {
                                "id": _uid("text"),
                                "type": "text",
                                "name": "Title 3",
                                "x": 24,
                                "y": 440,
                                "width": 342,
                                "height": 32,
                                "text": "Mulai Sekarang",
                                "style": {"color": "#18181b", "fontSize": 22, "fontWeight": 700},
                            },
                            {
                                "id": _uid("button"),
                                "type": "button",
                                "name": "Start Button",
                                "x": 24,
                                "y": 720,
                                "width": 342,
                                "height": 50,
                                "text": "Mulai Gunakan",
                                "style": {"fill": "#18181b", "color": "#ffffff", "radius": 10},
                            },
                        ],
                    }
                ]
            }

        # 4. Prototype Flow (Login to Home)
        if "flow" in p or result_type == "prototype_flow":
            f_login = _uid("frame")
            f_home = _uid("frame")
            return {
                "frames": [
                    {
                        "id": f_login,
                        "name": "Login Screen",
                        "nodes": [
                            {
                                "id": _uid("text"),
                                "type": "text",
                                "name": "Login Title",
                                "x": 24,
                                "y": 120,
                                "width": 342,
                                "height": 32,
                                "text": "Masuk akun",
                                "style": {"color": "#18181b", "fontSize": 20, "fontWeight": 700},
                            },
                            {
                                "id": _uid("input"),
                                "type": "input",
                                "name": "Email Input",
                                "x": 24, "y": 180,
                                "width": 342,
                                "height": 48,
                                "text": "email@example.com",
                                "style": {"fill": "#ffffff", "stroke": "#d4d4d8", "radius": 10},
                            },
                            {
                                "id": _uid("button"),
                                "type": "button",
                                "name": "Login Button",
                                "x": 24,
                                "y": 260,
                                "width": 342,
                                "height": 50,
                                "text": "Masuk",
                                "style": {"fill": "#18181b", "color": "#ffffff", "radius": 10},
                                "prototype": {"trigger": "tap", "action": "navigate", "target": f_home, "transition": "slide"},
                            },
                        ],
                    },
                    {
                        "id": f_home,
                        "name": "Home Screen",
                        "nodes": [
                            {
                                "id": _uid("text"),
                                "type": "text",
                                "name": "Hello Text",
                                "x": 24,
                                "y": 60,
                                "width": 342,
                                "height": 32,
                                "text": "Selamat Datang!!",
                                "style": {"color": "#18181b", "fontSize": 22, "fontWeight": 700},
                            },
                            {
                                "id": _uid("rectangle"),
                                "type": "rectangle",
                                "name": "Home Banner",
                                "x": 24,
                                "y": 110,
                                "width": 342,
                                "height": 180,
                                "style": {"fill": "#f4f4f5", "stroke": "#e4e4e7", "radius": 16},
                            },
                            {
                                "id": _uid("button"),
                                "type": "button",
                                "name": "Back Button",
                               "x": 24,
                                "y": 310,
                                "width": 342,
                                "height": 48,
                                "text": "Kembali ke Login",
                                "style": {"fill": "#ffffff", "stroke": "#18181b", "color": "#18181b", "radius": 10},
                                "prototype": {"trigger": "tap", "action": "back"},
                            },
                        ],
                    }
                ]
            }

        # 5. Default/Login Featured Screen (Even for generic fintech prompt)
        screen_name = "Fintech Login" if "fintech" in p or "login" in p else "AI Generated Screen"
        return {
            "frames": [
                {
                    "id": _uid("frame"),
                    "name": screen_name,
                    "nodes": [
                        {
                            "id": _uid("rectangle"),
                            "type": "rectangle",
                            "name": "Header Illustration",
                            "x": 145, "y": 100,
                            "width": 100,
                            "height": 100,
                            "style": {"fill": "#f4f4f5", "stroke": "#d4d4d8", "radius": 50},
                        },
                        {
                            "id": _uid("text"),
                            "type": "text",
                            "name": "Screen Title",
                            "x": 24,
                            "y": 220,
                            "width": 342,
                            "height": 32,
                            "text": "Selamat Datang",
                            "style": {"color": "#18181b", "fontSize": 24, "fontWeight": 700, "align": "center"},
                        },
                        {
                            "id": _uid("text"),
                            "type": "text",
                            "name": "Subtitle",
                            "x": 24,
                            "y": 260,
                            "width": 342,
                            "height": 24,
                            "text": "Masukkan data fintech anda",
                            "style": {"color": "#71717a", "fontSize": 14, "fontWeight": 400, "align": "center"},
                        },
                        {
                            "id": _uid("input"),
                            "type": "input",
                            "name": "Nomor Phone Input",
                            "x": 24, "y": 310,
                            "width": 342,
                            "height": 48,
                            "text": "+62 812 3456 7890",
                            "style": {"fill": "#ffffff", "stroke": "#d4d4d8", "radius": 10},
                        },
                        {
                            "id": _uid("input"),
                            "type": "input",
                            "name": "PIN Input",
                            "x": 24, "y": 370,
                            "width": 342,
                            "height": 48,
                            "text": "• • • ₈ • •",
                            "style": {"fill": "#ffffff", "stroke": "#d4d4d8", "radius": 10},
                        },
                        {
                            "id": _uid("button"),
                            "type": "button",
                            "name": "Masuk Button",
                            "x": 24,
                            "y": 450,
                            "width": 342,
                            "height": 50,
                            "text": "Masuk Sekarang",
                            "style": {"fill": "#18181b", "color": "#ffffff", "radius": 10},
                        },
                    ],
                }
            ]
        }
