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

## 4. Import & Export (`.low.json`)

- **Export**: Click the export icon in the left sidebar or toolbar to download the open `.low.json` file.
- **Import**: Drag any valid `.low.json` document onto the canvas or upload via the Import tab.

---

## 5. AI Import Engine

Generate complete screens, components, or interactive flows from plain English:

1. Click the **AI** icon (magic wand) in the left sidebar.
2. Select output type: `Screen`, `Component`, `Template`, or `Prototype Flow`.
3. Type your prompt, for example:
   > *"Create a monochrome mobile fintech dashboard with total balance card, quick transfer buttons, and recent transaction list."*
4. Click **Generate Draft**.
5. Inspect the generated visual preview and validation status.
6. Click **Apply to Canvas** to merge the generated nodes directly into your project!

---

## 6. Universal Agent Connect

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
