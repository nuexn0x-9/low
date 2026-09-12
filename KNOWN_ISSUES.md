# LOW — Known Issues & Deferred Items (v0.1.1)

**Date**: 2026-09-12  
**Current Release**: LOW v0.1.1  

This document tracks identified non-blocking items, edge cases, and architectural enhancements intentionally deferred from v0.1.1 to preserve stability and avoid scope creep.

---

## 1. Deferred Items & Minor Edge Cases

### 1.1 Local Docker Daemon Execution on Windows Host
- **Status**: Deferred / Documented
- **Description**: The host environment running tests does not have the Docker CLI in PATH (`docker` command not recognized).
- **Impact**: Docker containers could not be verified dynamically on this specific local test machine.
- **Mitigation & Verification**: `Dockerfile` (frontend multi-stage nginx, backend Python 3.12 slim) and `docker-compose.yml` configurations have been statically verified for correctness, port bindings (8000 & 3000), and environment variables.

### 1.2 Full Nested-AutoLayout Sizing Recalculation
- **Status**: Deferred to Phase 12 (Advanced Layout Engine)
- **Description**: Sizing modes (`hug`, `fill`, `fixed`) for deeply nested multi-level autoLayout containers compute direct children positions reliably. For arbitrarily deep trees (> 4 levels of nested autoLayout containers with dynamic text nodes), client-side DOM layout computes the final geometry.
- **Mitigation**: The current lightweight layout model satisfies the MVP scope and renders correctly in standard 1-to-3 level hierarchies.

### 1.3 Offline Mock AI Generation Diversity
- **Status**: Deferred to Future AI Iterations
- **Description**: When running in offline/mock mode without an external OpenAI API key, the AI Import Engine returns high-quality deterministic sample templates (Fintech Login, Marketplace Dashboard, Profile Settings).
- **Mitigation**: Users who configure an OpenAI API key or OpenAI-compatible endpoint receive full dynamic generations matching their custom prompts.

---

## 2. Recommendations for Future Releases (v0.2.0+)

1. **Phase 12 — Team Collaboration (Realtime CRDT/WebSockets)**:
   - Introduce Yjs or Automerge for multi-user cursor tracking and simultaneous editing.
2. **Phase 13 — Component Overrides & Variants**:
   - Support master component property overrides (text, color, icon) without detaching instances.
3. **Phase 14 — Mobile Gesture Prototyping**:
   - Add swipe-left, swipe-right, and pull-to-refresh transition gestures to preview player.
