# Changelog

All notable changes to **LOW (Lowcode Oriented Wireframe)** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
