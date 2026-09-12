# LOW — Post v0.1.0 Bugfix & Improvement Summary

**Date**: 2026-09-12  
**Release Target**: LOW v0.1.0  

---

## 1. Summary of Changes

### 1.1 Backend Fixes

1. **Project Deletion Guard in `_get_project_or_404`**  
   - **File**: `backend/app/api/routes_documents.py`
   - **Fix**: Added explicit check for soft-deleted projects (`Project.deleted_at.is_not(None)`). Prevents dev local user fallback from auto-recreating a deleted project.

2. **Thumbnail Endpoint Protection**  
   - **File**: `backend/app/api/routes_projects.py`
   - **Fix**: Added query check on `Project.deleted_at.is_(None)` in `get_project_thumbnail`. Returns 404 for deleted projects.

3. **Design Tokens Ownership & Deletion Guard**  
   - **File**: `backend/app/api/routes_projects.py`
   - **Fix**: Added user dependency (`get_current_user_optional`) and ownership constraint (`Project.owner_id == user.id`) to `get_project_design_tokens` and `update_project_design_tokens`.

### 1.2 Frontend UI/UX & Quality Fixes

1. **CanvasArea NaN Console Warning**  
   - **File**: `frontend/src/components/editor/CanvasArea.jsx`
   - **Fix**: Added default parameter `zoom = 1` in `CanvasArea` function definition to prevent `scale(undefined)` calculations during initial or unconfigured renders.

2. **Monochrome Design Alignment (Safe Area & Inspect Mode)**  
   - **Files**:
     - `frontend/src/components/editor/CanvasArea.jsx`
     - `frontend/src/components/editor/TopToolbar.jsx`
     - `frontend/src/components/editor/RightPropertiesPanel.jsx`
     - `frontend/src/components/editor/PreviewModal.jsx`
     - `frontend/src/utils/exportUtils.js`
   - **Fix**: Replaced hardcoded `#2563eb` (blue) elements with dark zinc/monochrome tokens (`zinc-900`, `zinc-500`, `zinc-400/40`, `rgba(24,24,27,0.04)`), maintaining strict monochrome UI consistency.

---

## 2. Automated Test Verification

1. **Backend Tests Added**:
   - `backend/tests/test_audit_v010.py`:
     - `test_all_sample_projects_round_trip`: Full round-trip import, export, and re-validation of all 4 sample `.low.json` files.
     - `test_soft_deleted_project_access_rejected`: Asserts 404 across `/document`, `/thumbnail`, `/design-tokens`, and `/export/*` on deleted projects.
     - `test_settings_never_leaks_raw_api_key`: Asserts sensitive keys are masked and never echoed in plain text.
   - **Result**: `61/61 passed`.

2. **Frontend Tests Added**:
   - `frontend/src/components/editor/__tests__/EditorAuditQA.test.jsx`:
     - Verified monochrome Safe Area toggle styling.
     - Verified monochrome Canvas Safe Area guide rendering.
     - Verified monochrome Developer Inspect styling in properties panel.
   - **Result**: `36/36 passed`.

3. **Build Check**:
   - `craco build` succeeded with zero compile errors.
