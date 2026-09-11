# LOW Release Checklist

This checklist must be executed and confirmed prior to tagging any release of **LOW**.

---

## 1. Automated Verification

- [ ] **Backend Tests**: All pytest tests pass cleanly (`cd backend && python -m pytest -v`).
- [ ] **Frontend Tests**: All Jest unit/integration tests pass cleanly (`cd frontend && npm test -- --watchAll=false`).
- [ ] **Frontend Production Build**: Production bundle compiles with zero errors or warnings (`cd frontend && npm run build`).
- [ ] **Docker Compose Build**: Containers build and run without error (`docker compose up -d --build`).
- [ ] **Backend Healthcheck**: `http://localhost:8000/api/health` returns `{"status": "ok"}`.

---

## 2. Configuration & Security Audit

- [ ] **No Secrets Committed**: Ensure `.env` is absent from git tracking and `.gitignore` ignores `*.db`, `data/`, `storage/`.
- [ ] **`.env.example` Consistency**: Every variable referenced in `backend/app/core/config.py` is documented with sensible defaults.
- [ ] **Token Exposure**: Confirm no plaintext agent tokens or hashes leak in instruction endpoints or logs.
- [ ] **Payload Limits**: Confirm 1MB payload limits and 25-op batch limits remain strictly enforced.

---

## 3. Manual Smoke Test Flow

1. [ ] **Dashboard**: Navigate to `http://localhost:3000`. Dashboard renders projects list.
2. [ ] **Create Project**: Create new project "Smoke Test". Project appears in list and database.
3. [ ] **Open Canvas Editor**: Click project to open editor canvas.
4. [ ] **Screen & Element Operations**:
   - Add a new screen.
   - Drag & drop a button and input component onto screen.
   - Resize and reposition element on canvas.
5. [ ] **Autosave & Persistence**:
   - Check status bar: "Saved" with last synced timestamp.
   - Refresh page: verify elements persist correctly.
6. [ ] **Import / Export**:
   - Export `.low.json`. Inspect file content for valid JSON structure.
   - Import `.low.json` into a new project. Canvas renders correctly.
7. [ ] **AI Import Engine**:
   - Open AI Tab in left sidebar.
   - Generate "Login Screen" using default `mock` provider.
   - Preview loads in canvas.
   - Click "Apply to Canvas". Screen is added to project.
8. [ ] **Universal Agent Connect**:
   - Open Agent Connect tab.
   - Select preset "Design Assistant" and click "Start Agent Session".
   - Copy cURL or click "Simulate (Dry Run)" -> Verify preview notification without document mutation.
   - Click "Simulate" -> Element added to canvas.
   - Click "Undo Change" -> Reverts element cleanly.
   - Click "Revoke" -> Status updates to Revoked.

---

## 4. Documentation & GitHub Governance

- [ ] `README.md` is updated with current release version and features.
- [ ] `CHANGELOG.md` reflects all merged PRs and features.
- [ ] `LICENSE` (AGPL-3.0) is present in root.
- [ ] Documentation in `docs/` is accurate and verified.
- [ ] GitHub issue and PR templates are verified.
