# LOW Universal Agent Connect — Action Catalog

This catalog documents all 18 actions supported by LOW Universal Agent Connect.

---

## Action Summary

| Action | Required Scope | Mutating | Description |
|---|---|---|---|
| `get_document` | `read_document` | No | Retrieve full document frames and elements |
| `list_screens` | `read_document` | No | Summary list of all screens |
| `create_screen` | `create_screen` | Yes | Add a new mobile screen |
| `rename_screen` | `edit_screen` | Yes | Rename an existing screen |
| `delete_screen` | `delete_screen` | Yes | Delete a screen (safe minimum 1) |
| `duplicate_screen` | `create_screen` | Yes | Duplicate a screen with all elements |
| `add_element` | `edit_screen` | Yes | Add a UI element to a screen |
| `update_element` | `edit_screen` | Yes | Patch element properties or styling |
| `move_element` | `edit_screen` | Yes | Move element coordinates (x, y) |
| `resize_element` | `edit_screen` | Yes | Resize element dimensions (width, height) |
| `duplicate_element` | `edit_screen` | Yes | Clone element with coordinate offset |
| `delete_element` | `edit_screen` | Yes | Delete element from screen |
| `link_prototype` | `edit_screen` | Yes | Link element navigation flow |
| `create_component` | `manage_components` | Yes | Create reusable component |
| `update_component` | `manage_components` | Yes | Update existing component |
| `save_template` | `manage_templates` | Yes | Save screen as template |
| `create_ai_draft` | `run_ai_import` | No* | Generate AI draft via AI engine |
| `apply_ai_draft` | `apply_ai_import` | Yes | Apply existing draft to document |
| `apply_ai_import` | `apply_ai_import` | Yes | Directly apply validated AI patch |
| `batch_update` | `batch_update` | Yes | Atomic batch of up to 25 operations |
| `undo_last_agent_change`| `undo_changes` | Yes | Rollback last applied mutation |

---

## Selected Action Examples

### 1. `resize_element`
```json
{
  "action": "resize_element",
  "params": {
    "screenId": "frame_home",
    "elementId": "btn_submit",
    "width": 342,
    "height": 56
  }
}
```

### 2. `duplicate_element`
```json
{
  "action": "duplicate_element",
  "params": {
    "screenId": "frame_home",
    "elementId": "btn_submit",
    "offsetX": 0,
    "offsetY": 70
  }
}
```

### 3. `duplicate_screen`
```json
{
  "action": "duplicate_screen",
  "params": {
    "screenId": "frame_login",
    "name": "Login Step 2"
  }
}
```

### 4. `batch_update`
```json
{
  "action": "batch_update",
  "params": {
    "operations": [
      {
        "action": "create_screen",
        "params": { "name": "Success Screen" }
      },
      {
        "action": "add_element",
        "params": {
          "screenId": "frame_login",
          "element": { "type": "button", "text": "Next", "x": 24, "y": 600, "width": 342, "height": 50 }
        }
      }
    ]
  }
}
```

### 5. `create_ai_draft` & `apply_ai_draft`
```json
{
  "action": "create_ai_draft",
  "params": {
    "resultType": "screen",
    "prompt": "Monochrome modern crypto wallet dashboard with balance and transactions",
    "provider": "mock"
  }
}
```

```json
{
  "action": "apply_ai_draft",
  "params": {
    "draftId": "aid_804947b4f9"
  }
}
```
