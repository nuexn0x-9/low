# LOW Backend Spec v1

## 1. Tujuan

Backend LOW v1 menyediakan penyimpanan permanen untuk frontend editor yang sudah ada. Backend harus ringan, mudah di-self-host, dan cukup kuat untuk menyimpan project desain mobile, dokumen `.low.json`, asset, component, template, dan agent session.

## 2. Stack

| Komponen | Pilihan |
|---|---|
| Runtime | Python |
| Framework | FastAPI |
| Database | SQLite |
| ORM | SQLAlchemy 2.x atau SQLModel |
| Migration | Alembic |
| Auth | JWT atau session cookie HttpOnly |
| Password hash | bcrypt atau argon2 |
| Asset storage | Folder lokal |
| Test | pytest |

## 3. Struktur Folder Backend

```txt
backend/
  app/
    main.py
    core/
      config.py
      security.py
      database.py
    models/
      user.py
      project.py
      document.py
      asset.py
      library.py
      agent.py
    schemas/
      auth.py
      project.py
      document.py
      asset.py
      library.py
      agent.py
    api/
      routes_auth.py
      routes_projects.py
      routes_documents.py
      routes_assets.py
      routes_library.py
      routes_agent.py
    services/
      document_service.py
      import_service.py
      asset_service.py
      agent_service.py
    tests/
  alembic/
  requirements.txt
  .env.example
```

## 4. Environment

```env
APP_NAME=LOW
APP_ENV=development
DATABASE_URL=sqlite+aiosqlite:///./low.db
ASSET_STORAGE_PATH=./storage/assets
JWT_SECRET=change-me
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## 5. API Minimum

Backend wajib menyediakan:

- `/api/health`
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/projects`
- `/api/projects/{project_id}`
- `/api/projects/{project_id}/document`
- `/api/projects/{project_id}/document/autosave`
- `/api/projects/{project_id}/document/versions`
- `/api/import/low-json/validate`
- `/api/projects/{project_id}/import/low-json`
- `/api/projects/{project_id}/export/low-json`
- `/api/projects/{project_id}/assets`
- `/api/assets/{asset_id}`
- `/api/components`
- `/api/templates`
- `/api/agent/schema`
- `/api/agent/sessions`
- `/api/agent/sessions/{sid}/document`
- `/api/agent/sessions/{sid}/events`
- `/api/agent/sessions/{sid}/actions`

## 6. Document Save Rules

- Backend menyimpan dokumen sebagai JSON utuh.
- Setiap save menaikkan `revision`.
- Autosave boleh menimpa dokumen aktif.
- Manual snapshot masuk ke `document_versions`.
- Import besar harus membuat snapshot sebelum mengganti dokumen.
- Backend harus menolak dokumen tanpa `frames`.

## 7. Import Validation Rules

File import valid jika:

- JSON bisa diparse.
- Memiliki `lowVersion` atau struktur frames yang kompatibel.
- Memiliki `document.frames`, `frames`, atau array frames.
- Setiap frame memiliki `id`, `name`, dan `nodes`.
- Setiap node memiliki `type`, `x`, `y`, `width`, dan `height`.
- Style/prototype boleh kosong.

Backend harus menormalisasi id kosong, style kosong, dan nama kosong.

## 8. Agent Security

- Token agent hanya ditampilkan satu kali saat session dibuat.
- Simpan hash token, bukan token asli.
- Session agent memiliki expiry.
- Mutating action harus memakai header `X-LOW-Token`.
- Semua action agent harus tercatat di `agent_events`.
- Agent action tidak boleh mengakses project milik user lain.

## 9. Frontend Integration

Frontend perlu mengganti `src/data/storage.js` menjadi adapter:

- `localStorageStorage` untuk demo/offline.
- `apiStorage` untuk backend.
- `storageProvider` untuk memilih mode.

Dengan pola ini frontend tidak perlu dibongkar besar saat backend masuk.

## 10. Definition of Done

Backend v1 selesai jika:

- test backend lulus;
- migration berjalan;
- user bisa register/login;
- project tersimpan di SQLite;
- editor bisa load dan save dokumen dari backend;
- autosave tidak merusak dokumen;
- import/export `.low.json` berjalan;
- asset upload dasar berjalan;
- component/template library berjalan;
- Agent Connect berjalan dengan SQLite;
- Docker Compose development tersedia.
