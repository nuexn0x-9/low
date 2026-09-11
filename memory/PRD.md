# LOW — Product Requirements & Progress

## Original Problem Statement
Build the frontend UI/UX editor "LOW" (Phase 1): a lightweight, monochrome (black/white/grey) web app for designing & prototyping MOBILE app UIs, used on desktop/laptop. Frontend-first, no real backend/AI/realtime yet. Based on PRD_LOW_v1 (Figma/Penpot-inspired, open-source, self-hostable vision; differentiator = "LOW Import Engine" for JSON/SVG/component/template/AI imports).

## User Choices (this build)
- Stack: existing React (JavaScript) + Tailwind (NOT Vite/TS, to preserve environment).
- Persistence: local state + localStorage (frontend-only).
- Scope: all dummy pages/panels per PRD + light interactions + REAL canvas drag/resize.
- Colors: monochrome; single subtle blue accent used only for selection.

## Architecture
- Frontend only. React 19 (CRA/craco) + Tailwind + react-router-dom. No backend used.
- Routes: `/` = ProjectDashboard, `/editor/:id` = EditorShell.
- State in EditorShell (nodes, selectedId, tool, mode, zoom, saveStatus). Debounced autosave to localStorage on user edits.
- Storage: `src/data/storage.js` (localStorage key `low_projects_v1`, seeds 3 demo projects, default login-screen nodes).

## User Personas
Startup founders, UI/UX beginners, indie developers, small teams, open-source contributors, AI users converting prompts to editable design.

## Core Requirements (static)
- Dashboard: LOW logo, New Project, project cards, empty state, open editor.
- Editor: top toolbar (Select/Frame/Rectangle/Text/Image/Component/Design-Prototype switch/Preview), left sidebar (Pages/Layers/Components/Templates/Import), center canvas (mobile login frame), right properties panel, bottom status bar, preview modal.
- Monochrome visual style, thin borders, small radius, system font, dense layout, no heavy effects.

## Implemented (2026-06)
- ✅ Project Dashboard with localStorage projects, New Project, delete, empty state, relative timestamps.
- ✅ Full editor shell layout (no overlap, fits desktop/small laptop).
- ✅ Top toolbar with tools; Rectangle/Text/Image/Component add real nodes; Design/Prototype mode switch; Preview; Undo/Redo buttons.
- ✅ Left sidebar tabs: Pages (screens list), Layers (clickable → select), Components (draggable), Templates (draggable), Import ("Import to LOW" + dropzone + Export/Import buttons).
- ✅ Canvas: dot-grid bg, mobile frames (390×844) rendered side by side, active frame outlined, real drag-to-move + corner resize, selection outline, zoom indicator, drop target for library items.
- ✅ Right Properties panel: X/Y/W/H, Fill, Stroke, Radius, Opacity, Typography, Prototype (trigger/action/target/transition). Live-binds; delete node.
- ✅ Bottom status bar: doc name, active screen, screen/layer counts, autosave status, zoom controls.
- ✅ Preview modal: multi-frame prototype navigation (tap linked elements → navigate with slide/fade), Back/Restart/Close.
- ✅ localStorage persistence. Tested 100% (iteration_1).

### Iteration 2 (2026-06) — new features, 100% tested (iteration_2)
- ✅ Multiple Screens: per-project `frames[]` model; add/delete/select screens; multi-frame canvas.
- ✅ Prototype Linking: node prototype target = another screen; working navigation in Preview.
- ✅ Undo/Redo: history stack, toolbar buttons (disabled states), Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, Delete key; drag = single undo step; rapid prop edits coalesced.
- ✅ JSON Export/Import: download `.low.json` (lowVersion + document.frames); import via button/dropzone with validation + toasts.
- ✅ Library Drag: drag components → add node to frame at drop point; drag templates → add new screen from preset.

## Backlog / Next (not yet built)
- P1: Real drag from Components/Templates onto canvas; multi-select; undo/redo; keyboard shortcuts.
- P1: Multiple pages/frames + frame navigation; real prototype links & transitions in preview.
- P2: low.json export/import + schema validator (Import Engine core).
- P2: SVG/icon import; design tokens; component instances/variants.
- P3: AI-generated JSON import (real), backend + auth + self-host packaging.

## Notes
- No mocked APIs. No backend calls. Single accent color = blue selection outline only.
