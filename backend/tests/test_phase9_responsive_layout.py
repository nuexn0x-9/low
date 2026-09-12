import pytest
from app.services.import_service import validate_and_normalize_low_data
from app.services.ai.low_json_guard import validate_and_guard_ai_patch
from app.services.agent_service import AGENT_SCHEMA, apply_action


def test_import_service_autolayout_and_scrollarea():
    # Valid document with autoLayout and scrollArea
    valid_doc = {
        "frames": [
            {
                "id": "f1",
                "name": "Screen 1",
                "preset": "iPhone 15",
                "width": 390,
                "height": 844,
                "safeArea": {"top": 44, "bottom": 34, "left": 0, "right": 0, "visible": True},
                "nodes": [
                    {
                        "id": "item1",
                        "type": "text",
                        "name": "Item 1",
                        "x": 16,
                        "y": 16,
                        "width": 300,
                        "height": 30,
                        "parentId": "auto1",
                        "layoutSizing": {"width": "fill", "height": "hug"},
                        "constraints": {"horizontal": "left-right", "vertical": "top"},
                    },
                    {
                        "id": "auto1",
                        "type": "autoLayout",
                        "name": "Card Stack",
                        "x": 20,
                        "y": 60,
                        "width": 350,
                        "height": 200,
                        "layout": {
                            "direction": "vertical",
                            "gap": 12,
                            "padding": {"top": 16, "right": 16, "bottom": 16, "left": 16},
                            "align": "stretch",
                            "justify": "start",
                            "wrap": False,
                        },
                        "children": ["item1"],
                    },
                    {
                        "id": "scroll1",
                        "type": "scrollArea",
                        "name": "Main Scroll",
                        "x": 0,
                        "y": 100,
                        "width": 390,
                        "height": 600,
                        "scroll": {
                            "direction": "vertical",
                            "contentHeight": 1200,
                            "contentWidth": 390,
                            "showIndicator": True,
                        },
                        "children": ["auto1"],
                    },
                ],
            }
        ]
    }
    is_valid, version, frames, errors, warnings = validate_and_normalize_low_data(valid_doc)
    assert is_valid is True
    assert len(frames) == 1
    f = frames[0]
    assert f["preset"] == "iPhone 15"
    assert f["safeArea"]["top"] == 44
    assert len(f["nodes"]) == 3


def test_import_service_rejects_negative_gap_and_padding():
    bad_gap_doc = {
        "frames": [
            {
                "id": "f1",
                "name": "Screen 1",
                "nodes": [
                    {
                        "id": "a1",
                        "type": "autoLayout",
                        "x": 0,
                        "y": 0,
                        "width": 100,
                        "height": 100,
                        "layout": {"direction": "vertical", "gap": -5},
                        "children": [],
                    }
                ],
            }
        ]
    }
    is_valid, _, _, errors, _ = validate_and_normalize_low_data(bad_gap_doc)
    assert is_valid is False
    assert any("negative gap" in e.lower() for e in errors)

    bad_pad_doc = {
        "frames": [
            {
                "id": "f1",
                "name": "Screen 1",
                "nodes": [
                    {
                        "id": "a1",
                        "type": "autoLayout",
                        "x": 0,
                        "y": 0,
                        "width": 100,
                        "height": 100,
                        "layout": {"direction": "vertical", "gap": 0, "padding": {"top": -10}},
                        "children": [],
                    }
                ],
            }
        ]
    }
    is_valid, _, _, errors, _ = validate_and_normalize_low_data(bad_pad_doc)
    assert is_valid is False
    assert any("negative padding" in e.lower() for e in errors)


def test_ai_guard_phase9_features():
    raw_ai = {
        "frames": [
            {
                "id": "f_ai",
                "name": "Home Screen",
                "preset": "Android Compact",
                "width": 360,
                "height": 800,
                "safeArea": {"top": 32, "bottom": 24, "left": 0, "right": 0},
                "nodes": [
                    {
                        "id": "btn1",
                        "type": "button",
                        "name": "Action",
                        "x": 20,
                        "y": 40,
                        "width": 320,
                        "height": 48,
                        "constraints": {"horizontal": "scale", "vertical": "bottom"},
                        "layoutSizing": {"width": "fill", "height": "fixed"},
                    },
                    {
                        "id": "al1",
                        "type": "autoLayout",
                        "name": "Form",
                        "x": 20,
                        "y": 100,
                        "width": 320,
                        "height": 200,
                        "layout": {
                            "direction": "horizontal",
                            "gap": 8,
                            "padding": 12,
                            "align": "center",
                            "justify": "space-between",
                        },
                        "children": ["btn1"],
                    },
                ],
            }
        ]
    }
    ok, guarded, errors, warnings = validate_and_guard_ai_patch(raw_ai)
    assert ok is True
    assert len(errors) == 0
    f = guarded["frames"][0]
    assert f["preset"] == "Android Compact"
    assert f["safeArea"]["top"] == 32
    n0 = f["nodes"][0]
    assert n0["constraints"] == {"horizontal": "scale", "vertical": "bottom"}
    assert n0["layoutSizing"] == {"width": "fill", "height": "fixed"}
    n1 = f["nodes"][1]
    assert n1["type"] == "autoLayout"
    assert n1["layout"]["direction"] == "horizontal"
    assert n1["layout"]["padding"]["top"] == 12


def test_agent_schema_v2_3_0():
    assert AGENT_SCHEMA["version"] in ("2.3.0", "2.4.0")
    action_names = [a["action"] for a in AGENT_SCHEMA["actions"]]
    expected_actions = [
        "create_auto_layout_from_selection",
        "update_auto_layout",
        "insert_into_auto_layout",
        "remove_from_auto_layout",
        "reorder_auto_layout_child",
        "update_constraints",
        "update_frame_preset",
        "update_safe_area",
        "create_scroll_area",
    ]
    for act in expected_actions:
        assert act in action_names


def test_agent_phase9_actions():
    doc = [
        {
            "id": "s1",
            "name": "Screen 1",
            "preset": "iPhone 15",
            "width": 390,
            "height": 844,
            "nodes": [
                {"id": "n1", "type": "text", "name": "Title", "x": 20, "y": 50, "width": 200, "height": 30},
                {"id": "n2", "type": "button", "name": "CTA", "x": 20, "y": 90, "width": 200, "height": 40},
                {"id": "n_pinned", "type": "button", "name": "Pinned Right", "x": 290, "y": 800, "width": 80, "height": 34, "constraints": {"horizontal": "right", "vertical": "bottom"}},
            ],
        }
    ]

    # 1. create_auto_layout_from_selection
    res1, doc = apply_action(doc, "create_auto_layout_from_selection", {
        "screenId": "s1",
        "nodeIds": ["n1", "n2"],
        "direction": "vertical",
        "gap": 10,
        "padding": 16,
    })
    assert res1["ok"] is True
    auto_id = res1["autoLayoutId"]
    assert len(res1["children"]) == 2

    # Check parentId set on n1 and n2
    f = doc[0]
    n1 = next(n for n in f["nodes"] if n["id"] == "n1")
    assert n1["parentId"] == auto_id

    # 2. update_auto_layout
    res2, doc = apply_action(doc, "update_auto_layout", {
        "screenId": "s1",
        "nodeId": auto_id,
        "layout": {"gap": 16, "align": "center"},
    })
    assert res2["ok"] is True
    assert res2["layout"]["gap"] == 16
    assert res2["layout"]["align"] == "center"

    # 3. reorder_auto_layout_child
    res3, doc = apply_action(doc, "reorder_auto_layout_child", {
        "screenId": "s1",
        "containerId": auto_id,
        "nodeId": "n2",
        "newIndex": 0,
    })
    assert res3["ok"] is True
    assert res3["children"] == ["n2", "n1"]

    # 4. update_constraints & layoutSizing
    res4, doc = apply_action(doc, "update_constraints", {
        "screenId": "s1",
        "nodeId": "n1",
        "constraints": {"horizontal": "left-right", "vertical": "top"},
        "layoutSizing": {"width": "fill", "height": "hug"},
    })
    assert res4["ok"] is True
    assert res4["constraints"] == {"horizontal": "left-right", "vertical": "top"}
    assert res4["layoutSizing"] == {"width": "fill", "height": "hug"}

    # 5. update_safe_area
    res5, doc = apply_action(doc, "update_safe_area", {
        "screenId": "s1",
        "safeArea": {"top": 48, "bottom": 38, "visible": False},
    })
    assert res5["ok"] is True
    assert res5["safeArea"]["top"] == 48
    assert res5["safeArea"]["visible"] is False

    # 6. update_frame_preset with constraint recalculation
    # Changing from iPhone 15 (390x844) to Android Large (412x915)
    # n_pinned had old_w=390, x=290, width=80 -> right_dist = 390 - 370 = 20
    # In new_w=412: new_x = 412 - 20 - 80 = 312
    # old_h=844, y=800, height=34 -> bottom_dist = 844 - 834 = 10
    # In new_h=915: new_y = 915 - 10 - 34 = 871
    res6, doc = apply_action(doc, "update_frame_preset", {
        "screenId": "s1",
        "preset": "Android Large",
        "applyConstraints": True,
    })
    assert res6["ok"] is True
    assert res6["width"] == 412
    assert res6["height"] == 915
    pinned = next(n for n in doc[0]["nodes"] if n["id"] == "n_pinned")
    assert pinned["x"] == 312
    assert pinned["y"] == 871

    # 7. create_scroll_area
    res7, doc = apply_action(doc, "create_scroll_area", {
        "screenId": "s1",
        "nodeIds": [auto_id],
        "direction": "vertical",
        "contentHeight": 1400,
    })
    assert res7["ok"] is True
    assert res7["children"] == [auto_id]
