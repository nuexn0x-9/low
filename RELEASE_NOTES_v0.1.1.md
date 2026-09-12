# Release Notes — LOW v0.1.1 (Stabilization & Safe Area Patch)

**Release Version:** `v0.1.1`  
**Date:** 2026-09-12  
**Type:** Patch & Bugfix Release  

---

## 🎯 Release Highlights

LOW **v0.1.1** is a stabilization patch addressing issues identified during the post-v0.1.0 audit and user testing, focusing on **Safe Area consistency**, **Screen Presets**, **Interactive Preview accuracy**, and **Backend Security Hardening**.

---

## 🛠️ Key Fixes & Improvements

### 1. Safe Area & Frame Presets
- **Toolbar Preset Switching**: Resolved a parameter argument order mismatch in `TopToolbar.jsx` that prevented screen preset changes from taking effect when selected via the top toolbar dropdown.
- **4-Sided Safe Area Guides**: Canvas and Preview Modal now render visual boundary guides for `left` and `right` safe area insets in addition to `top` and `bottom`.
- **Default Inset Alignment**: Standardized fallback safe area values across storage models to `top: 44, bottom: 34, left: 0, right: 0` (matching standard iPhone 15 specifications).
- **Preset Change Visibility**: Switching frame presets now automatically restores safe area visibility (`visible: true`).
- **Custom Size Persistence**: Editing width or height now correctly assigns the canonical `"Custom Size"` preset while preserving custom safe area settings.
- **Case-Preserving Import**: Backend document normalization (`import_service.py`) preserves exact preset key casing (e.g., `iPhone 15` rather than `iphone 15`), ensuring dropdowns and labels reflect the selected preset accurately after import.

### 2. Canvas & Snapping
- **Dynamic Snapping Bounds**: Fixed magnetic snapping lines in `CanvasArea.jsx` to dynamically reference the active frame's dimensions rather than a hardcoded 390×844 fallback.
- **Monochrome UI Consistency**: Updated active frame border outline from `#2563eb` (blue) to `#18181b` (monochrome minimalist).
- **Initial Mount Stability**: Guarded canvas scale calculations to prevent `NaN` React warnings during initial mount when zoom is resolving.

### 3. Security & Access Control Hardening
- **Soft-Deleted Document Protection**: Enforced soft-deletion validation across document retrieval and thumbnail generation to prevent unauthorized recreation or exposure of deleted projects.
- **Design Tokens Ownership**: Added authenticated user ownership verification to both `GET` and `PUT` design tokens endpoints.
- **Clean Asset Export**: Corrected SVG export parameter mapping so exported assets do not inadvertently contain editing guidelines.

---

## 🧪 Verification & Test Coverage

- **Backend**: 61 / 61 tests passing (`pytest backend/tests/`)
- **Frontend**: 38 / 38 tests passing (`npm test -- --watchAll=false`)
- **Production Build**: Clean compilation without errors (`npm run build`)

---

## 📦 Upgrade Instructions

If running via Docker Compose:
```bash
docker compose pull && docker compose up -d
```

If running from source:
```bash
git pull origin main
# Frontend
cd frontend && npm install && npm run build
# Backend
cd ../backend && pip install -r requirements.txt
```
