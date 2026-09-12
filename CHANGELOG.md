# Changelog

All notable changes to **LOW (Lowcode Oriented Wireframe)** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 2026-09-12 (Phase 10: Export, Handoff, and Developer Mode)

### Added
- **Developer Inspect Mode (`Design | Prototype | Inspect`)**:
  - Read-only canvas inspection mode preventing accidental element drag or resize while allowing deep node exploration.
  - Dedicated Developer Handoff Panel displaying node identity, metrics/layout (`X`, `Y`, `W`, `H`, parent sizing, constraints), auto layout properties, appearance (`fill`, `stroke`, `radius`, `opacity`), and typography attributes.
- **CSS, JSON, & Tailwind Utility Generators**:
  - Live generated CSS code preview (`.low-stack`, `.low-button`, `.low-card`, etc.) with 1-click clipboard copy (`copy-css-btn`).
  - 1-click JSON snippet copy for selected node or multi-selection (`copy-json-btn`).
  - Tailwind CSS utility class generator for selected nodes (`copy-tailwind-btn`).
  - Design tokens CSS custom properties exporter (`copy-tokens-btn`).
- **Asset Export Engine (SVG & PNG)**:
  - Export active frame or selection to SVG and PNG directly in the browser with zero external heavy dependencies.
  - Automatic filtering to exclude hidden nodes and optional safe area guidelines.
  - Toolbar quick action buttons for instant SVG and PNG frame export.
- **Design Tokens Exporter**:
  - Download design tokens as standard JSON (`tokens.json`) or CSS variables (`tokens.css`).
  - Backend API endpoints: `GET /api/projects/{id}/export/tokens.json` and `GET /api/projects/{id}/export/tokens.css`.
- **Standalone Offline Prototype Package (`prototype.zip`)**:
  - Full project bundle export including an interactive `index.html` prototype viewer, `low-prototype.json`, and instructions.
  - Mobile frame emulator supporting clickable prototype navigation, overlays, back, and restart completely offline without server dependencies.
  - Backend endpoint: `GET /api/projects/{id}/export/prototype.zip`.
- **Universal Agent Connect API v2.4.0**:
  - Bumped schema to `2.4.0` with 6 new atomic developer and handoff actions:
    - `export_project_low_json`: Exports complete document in `.low.json` schema.
    - `export_design_tokens`: Exports tokens in JSON, CSS, or both.
    - `export_frame_svg`: Renders frame markup into standalone SVG vector string.
    - `get_inspect_data`: Returns structured developer inspection payload for any node.
    - `get_node_css`: Generates standard CSS block for any node.
    - `get_prototype_package`: Returns offline package metadata.

## [1.3.0] - 2026-09-12 (Phase 9: Responsive Layout & Auto Layout)

### Added
- **Auto Layout Containers (`autoLayout`)**:
  - Flexbox flow direction (`vertical`, `horizontal`), configurable `gap`, and per-side padding (`top`, `right`, `bottom`, `left`).
  - Alignment (`start`, `center`, `end`, `stretch`) and justification (`start`, `center`, `end`, `space-between`).
  - Child sizing modes: `fixed` px, `fill` container, and `hug` contents.
  - `Shift + A` shortcut and top toolbar button to pack selected elements into Auto Layout or unpack via ungroup (`Ctrl+Shift+G`).
- **Responsive Constraints (`constraints`)**:
  - Horizontal constraints: `left`, `right`, `left-right`, `center`, `scale`.
  - Vertical constraints: `top`, `bottom`, `top-bottom`, `center`, `scale`.
  - Automatic recalculation of child element positions and dimensions on screen frame resize.
- **Mobile Device Frame Presets & Safe Area**:
  - Screen presets: `iPhone 15`, `iPhone SE`, `Android Compact`, `Android Large`, and `Custom Size`.
  - Configurable safe area insets (`top`, `bottom`, `left`, `right`) with visual dashed guidelines in editor and preview.
  - Quick preset selector and safe area visibility toggle in Top Toolbar and Properties Panel.
- **Scroll Area Containers (`scrollArea`)**:
  - Scrollable viewport with `vertical`, `horizontal`, or `both` overflow and virtual scroll canvas dimensions.
- **Universal Agent Connect API v2.3.0**:
  - Bumped schema to `2.3.0` with 9 new atomic actions: `create_auto_layout_from_selection`, `update_auto_layout`, `insert_into_auto_layout`, `remove_from_auto_layout`, `reorder_auto_layout_child`, `update_constraints`, `update_frame_preset`, `update_safe_area`, `create_scroll_area`.

## [1.2.0] - 2026-09-12 (Phase 8: Text, Components, and Design System Upgrade)

### Added
- **Canvas Text Editing**: Inline canvas text editing on double click with live blur/enter save.
- **Typography & Color Tokens**: Full typography system (`fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `textAlign`, `textTransform`, `textDecoration`).
- **Component Instances**: Reusable custom components with master definitions and instances supporting text and style overrides with detach capability.
- **Design System Tokens & Style Presets**: 11 one-click style presets (`primary_button`, `secondary_button`, `input_field`, `card`, `heading`, `body_text`, `label`, `app_bar`, `bottom_navigation`, `bottom_sheet`, `dialog`) and project design tokens.

## [1.1.0] - 2026-09-11 (Phase 7: Editor Selection & Workflow Upgrade)

### Added
- **Multi-Select & Canvas Marquee**: Canvas marquee/lasso selection, `Shift + Click` / `Cmd + Click` multi-select, and shared bounding box.
- **Group & Ungroup**: `Ctrl+G` group and `Ctrl+Shift+G` ungroup with bounding box calculations.
- **Bulk Alignment & Spacing**: Left, center, right, top, middle, bottom alignment and horizontal/vertical spacing distribution.
- **Layer Lock & Hide**: Lock and hide layers directly from the left sidebar layer tree.

## [1.0.0] - 2026-09-11 (MVP Release)

### Added
- **Phase 1: Backend Foundation**:
  - FastAPI backend with asynchronous SQLite (`aiosqlite` + SQLAlchemy).
  - Open `.low.json` document lifecycle with optimistic revision increments.
  - Built-in component and screen template library.
  - Project CRUD and asset upload endpoints.
- **Phase 2: Product Hardening**:
  - Optimistic concurrency control with revision conflict detection (409 Conflict).
  - Strict schema validation for `.low.json` element nodes, dimensions, and prototype actions.
  - Lightweight SVG project thumbnail generation.
  - Orphan asset garbage collection.
  - Docker Compose and containerization files.
- **Phase 3: AI Import Engine**:
  - `BaseAIProvider` interface with offline deterministic `MockAIProvider`.
  - Structured `.low.json` generation for screens, components, templates, and interactive prototype flows.
  - Safety validation guards (payload size, node count, dimension limits, XSS sanitization).
  - Frontend `AiImportPanel` with preview and one-click apply to canvas.
- **Phase 4: AI Provider Hardening**:
  - Hardened `OpenAIAIProvider` with JSON Mode, timeout guards, exponential retry/backoff, and token sanitization.
  - `AIImportDraft` persistence model and draft history tracking.
  - Multi-tab AI panel (Summary, JSON Editor, History) with draft regeneration and re-validation.
- **Phase 5: Universal Agent Connect**:
  - Vendor-neutral HTTP protocol for external agents (Codex, Claude, Cursor, Antigravity, Hermes).
  - 12 fine-grained permission scopes and 5 permission presets.
  - 18 typed actions including resize, duplicate, component creation, and AI draft generation.
  - Dry-run simulation mode (`dryRun: true`).
  - Atomic batch updates (up to 25 operations per batch).
  - Reversible mutation audit logs with instant undo capability.
  - Comprehensive Agent Connect UI with live activity feed and token instructions.
- **Phase 6: Packaging & Public MVP Readiness**:
  - Production-ready `docker-compose.yml` with backend healthcheck and persistent volumes.
  - Automated CLI scripts (`seed.py`, `reset_dev.py`, `backup.py`).
  - Cross-platform `Makefile`.
  - Comprehensive documentation suite in `docs/` (`INSTALLATION`, `USAGE`, `SELF_HOSTING`, `DEVELOPMENT`, `BACKUP_RESTORE`, `AI_IMPORT_ENGINE`, `LOW_FORMAT`, `ROADMAP`, `FAQ`).
  - GitHub community templates (Bug report, Feature request, PR template, CI workflow).
  - AGPL-3.0 open-source license.
