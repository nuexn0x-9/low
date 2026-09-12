# Changelog

All notable changes to **LOW (Lowcode Oriented Wireframe)** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
