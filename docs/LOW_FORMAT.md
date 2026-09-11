# The `.low.json` Document Format Specification

**LOW** uses `.low.json`, an open, human-readable, schema-validated JSON format designed specifically for mobile UI/UX wireframes.

---

## 1. Top-Level Structure

```json
{
  "lowVersion": "1.0.0",
  "document": {
    "id": "proj_abc123",
    "name": "Mobile Banking App",
    "frames": [
      {
        "id": "frame_login",
        "name": "Login Screen",
        "nodes": []
      }
    ]
  }
}
```

---

## 2. Frame (Screen) Schema

Each frame represents a single mobile canvas frame with fixed width and height (default mobile viewport: 390 x 844 px).

| Property | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (e.g. `frame_xxx`) |
| `name` | `string` | Human-readable screen title |
| `nodes` | `Array<Node>` | Array of element nodes located on this screen |

---

## 3. Node (Element) Schema

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique node identifier |
| `type` | `string` | Yes | Node type (must be in allowlist) |
| `name` | `string` | Yes | Element name shown in layer tree |
| `x` | `number` | Yes | Horizontal coordinate relative to screen frame |
| `y` | `number` | Yes | Vertical coordinate relative to screen frame |
| `width` | `number` | Yes | Width in pixels (must be >= 0) |
| `height` | `number` | Yes | Height in pixels (must be >= 0) |
| `text` | `string` | No | Text content or label |
| `style` | `object` | No | Visual styling properties |
| `prototype` | `object` | No | Interactive navigation metadata |

### Allowed Node Types
`text`, `rectangle`, `input`, `button`, `link`, `image`, `bottomnav`, `component`.

### Style Properties
- `fill`: Background color hex (`#18181b`, `#ffffff`, etc.)
- `stroke`: Border color hex (`#d4d4d8`, `#e4e4e7`)
- `strokeWidth`: Border width in pixels
- `radius`: Border corner radius in pixels (e.g. 8, 12, 999 for pills)
- `color`: Text color hex
- `fontSize`: Font size in pixels (e.g. 12, 14, 16, 24)
- `fontWeight`: Font weight (400, 500, 600, 700)
- `align`: Text alignment (`left`, `center`, `right`)
- `opacity`: Opacity (0 to 100)

### Prototype Interaction Properties
```json
{
  "trigger": "tap",
  "action": "navigate",
  "target": "frame_dashboard",
  "transition": "slide"
}
```
- `trigger`: `tap`, `longpress`, `none`
- `action`: `navigate`, `back`, `overlay`, `none`
- `target`: ID or name of destination frame
- `transition`: `slide`, `fade`, `instant`
- `overlayType` (if action is overlay): `bottom-sheet`, `centered-dialog`
