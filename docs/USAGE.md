# LOW User Guide & Manual

**LOW** is a self-hosted, monochrome mobile UI/UX wireframe editor designed for fast prototyping, AI document generation, and external agent collaboration.

---

## 1. Project Management

- **Creating a Project**: From the dashboard (`/`), click **New Project**, input a title, and click **Create**.
- **Opening a Project**: Click any project card to enter the editor shell.
- **Project Settings & Deletion**: Delete projects from the dashboard card options.

---

## 2. Canvas & Screen Operations

- **Screen Concept**: Every design screen represents a standard mobile frame (390 x 844 px, iPhone 14 dimensions).
- **Adding Screens**:
  - Click the **+** button in the Screens sidebar panel.
  - Or drag a screen template from the **Templates** tab.
- **Renaming Screens**: Double-click the screen title in the left sidebar or canvas top header.
- **Duplicating Screens**: Use agent command or duplicate shortcut (`Ctrl+D` / `Cmd+D`).
- **Canvas Zoom & Pan**:
  - Hold `Space` and drag to pan across screens.
  - Use `Ctrl + Wheel` or top zoom buttons to adjust zoom (50% to 150%).

---

## 3. Elements & Components

### Supported Element Types
- `text`: Headings, subtitles, body copy.
- `rectangle`: Cards, containers, surface backgrounds, divider lines.
- `input`: Form input fields with placeholder text.
- `button`: Primary, secondary, and text action buttons.
- `link`: Interactive hypertext links.
- `image`: Visual asset placeholders with upload support.
- `bottomnav`: Fixed bottom navigation bars with active icons.
- `component`: Reusable symbols.

### Interactivity & Prototyping
1. Select any element (e.g. a Login button).
2. In the right properties panel, locate the **Prototype** section.
3. Select trigger: `tap` or `longpress`.
4. Select target screen and transition (`slide`, `fade`, or `overlay`).
5. Click **Preview** in the top toolbar to run the clickable mobile prototype!

---

## 4. Layout, Workflow & Auto Layout

- **Multi-Selection & Marquee**:
  - Drag over canvas empty space to marquee select multiple elements.
  - Hold `Shift + Click` or `Ctrl/Cmd + Click` to add/remove elements from selection.
  - Group elements with `Ctrl+G` / `Cmd+G` and ungroup with `Ctrl+Shift+G`.
  - Alignment tools: Align Left, Center, Right, Top, Middle, Bottom.
  - Distribute Spacing: Distribute horizontal and vertical gap evenly across 3+ items.
- **Auto Layout Containers (`Shift + A`)**:
  - Wrap any selected elements into a responsive flexbox container.
  - Set direction (`horizontal` or `vertical`), gap, padding, align, and justify.
  - Set child sizing to `fixed` (px), `fill` (container), or `hug` (contents).
- **Responsive Constraints & Presets**:
  - Horizontal constraints (`left`, `right`, `left-right`, `center`, `scale`).
  - Screen presets: `iPhone 15`, `iPhone SE`, `Android Compact`, `Android Large`, or custom size.
  - Safe area inset guides for notch and home indicator bars.

---

## 5. Developer Inspect Mode & Handoff

Switch to **Inspect** in the top toolbar segmented switch (`Design | Prototype | Inspect`):
- **Read-Only Inspection**: Canvas interaction is non-destructive—click any element to inspect without moving or resizing.
- **Metrics & Box Model**: Coordinates, dimensions, constraints, and auto layout hierarchy.
- **Code Generators**:
  - **Copy CSS**: 1-click standard CSS box model snippet.
  - **Tailwind**: Utility classes for dimensions, spacing, fonts, and colors.
  - **Copy JSON**: Raw `.low.json` node snippet.
  - **Tokens**: CSS `:root { --low-... }` custom variables.

---

## 6. Export & Handoff

- **Vector SVG Export**: Export the active screen or selected elements as clean standalone SVGs via the toolbar or Inspect panel.
- **PNG Export**: Client-side high-resolution rasterization of individual screens and nodes.
- **Design Tokens Export**: Export `tokens.json` and `tokens.css`.
- **Standalone Offline Prototype (`prototype.zip`)**: Export an offline interactive bundle with zero external server dependencies, playable directly in any modern browser via `index.html`.
- **LOW Format (`.low.json`)**: Export and import transparent project files.

---

## 7. AI Import Engine

Generate complete screens, components, or interactive flows from plain English:

1. Click the **AI** icon (magic wand) in the left sidebar.
2. Select output type: `Screen`, `Component`, `Template`, or `Prototype Flow`.
3. Type your prompt, for example:
   > *"Create a monochrome mobile fintech dashboard with total balance card, quick transfer buttons, and recent transaction list."*
4. Click **Generate Draft**.
5. Inspect the generated visual preview and validation status.
6. Click **Apply to Canvas** to merge the generated nodes directly into your project!

---

## 8. Universal Agent Connect (v2.4.0)

Allow external AI agents (Cursor, Claude, Codex, Antigravity, Hermes) to read and edit your design in real time:

1. Click the **Agent Connect** tab (bot icon) in the left sidebar.
2. Choose a **Permission Preset**:
   - `Design Assistant`: Screens, elements, and components.
   - `Prototype Assistant`: Linking navigation flows.
   - `AI Import Assistant`: Generating and applying AI drafts.
   - `Full Editor Assistant`: All permissions.
   - `Read Only`: Safe inspection without mutations.
3. Click **Start Agent Session**.
4. Click **Copy Instructions** and paste the text into your agent's chat.
5. Watch the canvas update live as the agent executes actions!
6. Use **Dry Run Simulation** to test without modifying, or **Undo Change** to revert agent mutations instantly.
