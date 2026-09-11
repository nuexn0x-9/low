# LOW Universal Agent Connect — Protocol Specification

**LOW Universal Agent Connect** is an open, vendor-neutral, self-hostable HTTP API designed for AI agents (Cursor, Claude, Codex, Antigravity, Hermes, etc.) to inspect and manipulate LOW mobile UI/UX design documents.

---

## 1. Core Principles

- **Zero Direct Database Access**: Agents communicate exclusively through scoped HTTP endpoints.
- **Strict Allowlist**: Only predefined actions in the action schema are accepted.
- **One-Time Plaintext Token**: Plaintext tokens are returned solely upon session creation and never logged or re-exposed.
- **Salted Hash Storage**: Database persists only salted SHA-256 hashes (`token_hash`).
- **Session Scopes & Presets**: Every mutation requires matching permission scopes.
- **Session Revocation & Expiry**: Sessions can be revoked by the user at any time or naturally expire.
- **Dry-Run Simulation**: Preview mutations without touching the document or revision sequence.
- **Atomic Operations**: All mutations (single or batch) are strictly atomic.
- **Immutable Audit Trail**: Pre- and post-mutation document snapshots and status are recorded in the event log.
- **Instant Undo**: Users or agents can rollback the last mutation safely.

---

## 2. Authentication & Headers

Every request to mutating or authenticated endpoints requires the secret token returned when the session was created:

```http
POST /api/agent/sessions/{session_id}/actions
Content-Type: application/json
X-LOW-Token: <YOUR_TOKEN_HERE>
```

Failure cases:
- `401 Unauthorized`: Token missing, invalid, or session expired.
- `403 Forbidden`: Session has been revoked, or lacks required permission scope.

---

## 3. Permission Scopes & Presets

### Available Scopes

| Scope | Description |
|---|---|
| `read_document` | Read full design document and list screens |
| `write_document` | General mutation permissions |
| `create_screen` | Create or duplicate screens |
| `edit_screen` | Add, update, move, resize, duplicate, or delete elements, and rename screens |
| `delete_screen` | Remove screens (with minimum 1 screen safeguard) |
| `manage_components` | Create and update reusable components |
| `manage_templates` | Save screen templates |
| `run_ai_import` | Generate AI design drafts |
| `apply_ai_import` | Apply AI patches and drafts to the document |
| `batch_update` | Execute atomic multi-action batches |
| `dry_run` | Simulate actions without modifying documents |
| `undo_changes` | Revert applied actions |

### Standard Presets

1. **Full Editor Assistant** (Default): All 12 scopes.
2. **Design Assistant**: Screens, elements, components, and dry-run preview.
3. **Prototype Assistant**: Navigation flows, interactions, and element properties.
4. **AI Import Assistant**: Generate and apply AI screens and components.
5. **Read Only**: Document and screen inspection without mutation.

---

## 4. Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/agent/schema` | Discover supported actions and scopes | No |
| `POST` | `/api/agent/sessions` | Create a new session with presets/scopes | No |
| `GET` | `/api/agent/sessions/{sid}` | Inspect session metadata | No |
| `POST` | `/api/agent/sessions/{sid}/revoke` | Revoke agent session | No |
| `GET` | `/api/agent/sessions/{sid}/instructions` | Get generated instructions & cURL | No |
| `GET` | `/api/agent/sessions/{sid}/document` | Read full canvas document | No |
| `GET` | `/api/agent/sessions/{sid}/events` | Read audit event history | No |
| `POST` | `/api/agent/sessions/{sid}/actions` | Execute an action (or dry-run) | Yes (`X-LOW-Token`) |
| `POST` | `/api/agent/sessions/{sid}/undo-last` | Undo the last applied mutation | No |
| `POST` | `/api/agent/events/{event_id}/undo` | Undo a specific event | No |
| `DELETE` | `/api/agent/sessions/expired` | Prune expired sessions | No |

---

## 5. Size and Batch Limits

- **Maximum Payload Size**: 1 MB (1,048,576 bytes) per action request. Exceeding returns `413 Payload Too Large`.
- **Maximum Batch Operations**: 25 operations per `batch_update`. Exceeding returns `400 Bad Request`.
