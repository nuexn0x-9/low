# LOW Audit and Backend Plan v1

## 1. Ringkasan Audit

Frontend LOW sudah melewati tahap mockup awal. Aplikasi saat ini sudah memiliki dashboard project, editor utama, canvas mobile, panel layer, component/template library, import/export `.low.json`, preview prototype, undo/redo, autosave lokal, dan Agent Connect.

Secara produk, ini cukup kuat untuk dijadikan dasar backend. Backend berikutnya sebaiknya tidak dimulai sebagai CRUD umum, tetapi sebagai **document backend** untuk menyimpan project desain, versi dokumen, asset, import/export, dan agent session.

## 2. Struktur Saat Ini

| Area | Temuan |
|---|---|
| Frontend | React 19, CRACO, Tailwind, React Router |
| State | Mayoritas state editor berada di `EditorShell.jsx` |
| Storage | `localStorage` melalui `frontend/src/data/storage.js` |
| Document format | Export `lowVersion: 1.0.0` + `document.frames` |
| Canvas | DOM/SVG-like React nodes, bukan canvas bitmap |
| Prototype | Preview modal mendukung navigate, back, fade/slide sederhana |
| Import | Import JSON dasar, validasi masih minimal |
| Agent | Sudah ada Agent tab dan backend endpoint awal |
| Backend saat ini | FastAPI + MongoDB template, belum sesuai prinsip ringan/self-hosted |

## 3. Fitur Frontend yang Sudah Ada

- Dashboard project dengan project dummy.
- New Project.
- Delete project.
- Editor layout lengkap: toolbar, left sidebar, canvas, properties panel, bottom status bar.
- Multiple frames/screens.
- Add screen.
- Delete screen.
- Add rectangle, text, image, component.
- Drag component/template dari sidebar ke canvas.
- Move dan resize node.
- Selection outline.
- Layer list.
- Properties untuk position, size, appearance, typography, prototype.
- Undo/redo.
- Autosave lokal.
- Export `.low.json`.
- Import `.low.json`.
- Preview prototype.
- Agent Connect UI.

## 4. Catatan UI/UX

Desain sudah cocok dengan arah LOW: minimal, monochrome, padat, dan terasa sebagai editor kerja.

Revisi kecil yang disarankan sebelum backend penuh:

- Ganti warna seleksi biru `#2563eb` menjadi hitam/abu gelap agar tetap monochrome.
- Ganti indikator agent connected biru menjadi hitam atau abu gelap.
- Pisahkan logic editor dari `EditorShell.jsx` secara bertahap karena file ini sudah menjadi pusat semua state.
- Tambahkan empty/error state untuk backend sync setelah backend dibuat.
- Tambahkan status penyimpanan yang membedakan `Saved locally`, `Syncing`, `Saved to server`, dan `Offline`.

## 5. Keputusan Backend

Backend LOW v1 sebaiknya memakai:

| Komponen | Keputusan |
|---|---|
| Backend | FastAPI |
| Database | SQLite |
| ORM | SQLAlchemy 2.x atau SQLModel |
| Migration | Alembic |
| Asset storage | Filesystem lokal |
| Auth MVP | Local email/password |
| Document storage | JSON document blob + metadata |
| Realtime | Belum masuk backend v1 |
| Agent session | Dipertahankan sebagai fitur eksperimental |

Alasan utama: frontend sekarang sudah dibuat dengan React dan sudah ada backend FastAPI awal. Agar proyek tetap ringan dan self-hostable, MongoDB sebaiknya diganti dengan SQLite. Ini lebih sesuai dengan identitas LOW dan lebih mudah dijalankan di VPS kecil.

## 6. Backend yang Harus Dibangun

Backend v1 harus menyediakan fondasi berikut:

- Auth lokal.
- User.
- Project.
- Document save/load.
- Autosave endpoint.
- Import/export `.low.json`.
- Asset upload dasar.
- Component library.
- Template library.
- Document version snapshot.
- Agent session API eksperimental.

## 7. Model Data Awal

### users

| Field | Tipe |
|---|---|
| id | string |
| email | string unique |
| password_hash | string |
| name | string |
| created_at | datetime |
| updated_at | datetime |

### projects

| Field | Tipe |
|---|---|
| id | string |
| owner_id | string |
| name | string |
| description | text nullable |
| thumbnail_asset_id | string nullable |
| created_at | datetime |
| updated_at | datetime |
| deleted_at | datetime nullable |

### documents

| Field | Tipe |
|---|---|
| id | string |
| project_id | string unique |
| low_version | string |
| content_json | json/text |
| created_at | datetime |
| updated_at | datetime |

### document_versions

| Field | Tipe |
|---|---|
| id | string |
| document_id | string |
| version_number | integer |
| content_json | json/text |
| reason | string nullable |
| created_at | datetime |

### assets

| Field | Tipe |
|---|---|
| id | string |
| owner_id | string |
| project_id | string nullable |
| file_name | string |
| mime_type | string |
| size_bytes | integer |
| storage_path | string |
| created_at | datetime |

### components

| Field | Tipe |
|---|---|
| id | string |
| owner_id | string |
| project_id | string nullable |
| name | string |
| category | string nullable |
| content_json | json/text |
| created_at | datetime |
| updated_at | datetime |

### templates

| Field | Tipe |
|---|---|
| id | string |
| owner_id | string nullable |
| name | string |
| category | string nullable |
| content_json | json/text |
| is_builtin | boolean |
| created_at | datetime |
| updated_at | datetime |

### agent_sessions

| Field | Tipe |
|---|---|
| id | string |
| project_id | string nullable |
| token_hash | string |
| document_snapshot_json | json/text |
| seq | integer |
| expires_at | datetime |
| created_at | datetime |
| updated_at | datetime |

### agent_events

| Field | Tipe |
|---|---|
| id | string |
| session_id | string |
| seq | integer |
| action | string |
| params_json | json/text |
| result_json | json/text |
| created_at | datetime |

## 8. API Backend v1

### Auth

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/auth/register` | Membuat user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Ambil user aktif |

### Projects

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/projects` | List project milik user |
| POST | `/api/projects` | Buat project |
| GET | `/api/projects/{project_id}` | Detail project |
| PATCH | `/api/projects/{project_id}` | Rename/update metadata |
| DELETE | `/api/projects/{project_id}` | Soft delete project |

### Documents

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/projects/{project_id}/document` | Load dokumen |
| PUT | `/api/projects/{project_id}/document` | Save dokumen penuh |
| POST | `/api/projects/{project_id}/document/autosave` | Autosave |
| POST | `/api/projects/{project_id}/document/versions` | Buat snapshot versi |
| GET | `/api/projects/{project_id}/document/versions` | List versi |

### Import/Export

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/import/low-json/validate` | Validasi file LOW JSON |
| POST | `/api/projects/{project_id}/import/low-json` | Import ke project |
| GET | `/api/projects/{project_id}/export/low-json` | Export dokumen |

### Assets

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/projects/{project_id}/assets` | Upload SVG/image |
| GET | `/api/projects/{project_id}/assets` | List asset |
| GET | `/api/assets/{asset_id}` | Serve asset |
| DELETE | `/api/assets/{asset_id}` | Delete asset |

### Component Library

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/components` | List component |
| POST | `/api/components` | Simpan component |
| GET | `/api/components/{component_id}` | Detail component |
| PATCH | `/api/components/{component_id}` | Update component |
| DELETE | `/api/components/{component_id}` | Delete component |

### Template Library

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/templates` | List template |
| POST | `/api/templates` | Simpan template user |
| GET | `/api/templates/{template_id}` | Detail template |
| PATCH | `/api/templates/{template_id}` | Update template user |
| DELETE | `/api/templates/{template_id}` | Delete template user |

### Agent API

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/agent/schema` | Daftar action agent |
| POST | `/api/agent/sessions` | Buat agent session |
| GET | `/api/agent/sessions/{sid}/document` | Baca snapshot |
| GET | `/api/agent/sessions/{sid}/events` | Poll events |
| POST | `/api/agent/sessions/{sid}/actions` | Kirim action agent |

## 9. Format Dokumen LOW v1.1

Frontend sekarang memakai `document.frames`. PRD berikutnya perlu menetapkan schema lebih jelas tanpa mematahkan export yang sudah ada.

Struktur minimal:

```json
{
  "lowVersion": "1.1.0",
  "document": {
    "id": "doc_001",
    "projectId": "project_001",
    "name": "Mobile App",
    "framePreset": {
      "width": 390,
      "height": 844
    },
    "frames": [
      {
        "id": "frame_login",
        "name": "Login",
        "nodes": []
      }
    ],
    "components": [],
    "templates": [],
    "assets": [],
    "meta": {
      "createdBy": "LOW",
      "updatedAt": "2026-09-10T00:00:00Z"
    }
  }
}
```

## 10. Prioritas Implementasi Backend

### Phase B1 — Backend Foundation

- Hapus dependensi MongoDB.
- Tambah SQLite.
- Tambah migration.
- Tambah health endpoint.
- Tambah struktur app modular.
- Tambah config `.env`.

### Phase B2 — Project and Document Persistence

- API projects.
- API document load/save.
- Ganti frontend `localStorage` menjadi API backend.
- Pertahankan fallback localStorage sementara untuk offline/dev mode.

### Phase B3 — Import Export

- Validasi `low.json`.
- Import dokumen.
- Export dokumen.
- Simpan snapshot document_versions saat import besar atau manual save.

### Phase B4 — Asset and Library

- Upload SVG/image.
- Serve asset lokal.
- Component library.
- Template library.

### Phase B5 — Agent Connect

- Pindahkan Agent API ke SQLite.
- Hash token agent, jangan simpan plain token.
- Tambah expiry session.
- Batasi action yang boleh dilakukan agent.
- Tambah audit event.

## 11. Revisi PRD yang Dibutuhkan

PRD harus dinaikkan dari rencana konseptual menjadi dokumen produk yang mengakui fitur frontend yang sudah jadi:

- LOW sudah memiliki editor UI awal.
- Import/export `.low.json` sudah menjadi fitur inti.
- Agent Connect menjadi fitur pembeda tambahan selain LOW Import Engine.
- Backend harus mendukung local-first transition: dari localStorage ke server storage.
- Target backend awal bukan kolaborasi realtime, tetapi persistensi dokumen dan library.
- Monochrome menjadi design principle resmi untuk versi awal.

## 12. Risiko dan Rekomendasi

| Risiko | Rekomendasi |
|---|---|
| Backend MongoDB membuat LOW terasa lebih berat | Ganti ke SQLite |
| State editor terlalu terpusat di satu komponen | Pecah bertahap menjadi editor engine/hooks |
| Import JSON belum divalidasi ketat | Tambahkan schema validator di frontend dan backend |
| Agent token disimpan plain | Backend baru harus menyimpan hash token |
| Autosave konflik dengan multi-tab | Tambahkan `document.updated_at` dan revision number |
| Bundle frontend bisa berat karena banyak dependency UI | Audit dependency sebelum production |

## 13. Dokumen Lanjutan yang Disarankan

- `PRD_LOW_v1_1.md`
- `LOW_BACKEND_SPEC_v1.md`
- `LOW_DATA_MODEL_v1.md`
- `LOW_API_SPEC_v1.md`
- `LOW_AGENT_PROMPT_BACKEND_PHASE_1.md`
