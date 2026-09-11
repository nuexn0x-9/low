# Prompt Coding Agent — LOW Backend Phase 1

## Tugas

Audit repository LOW yang sudah memiliki frontend editor, lalu bangun backend ringan untuk menggantikan storage lokal secara bertahap.

Fokus backend Phase 1:

- FastAPI;
- SQLite;
- project persistence;
- document persistence;
- import/export `.low.json`;
- autosave;
- struktur awal asset/component/template;
- mempertahankan Agent Connect dengan storage SQLite.

## Konteks Penting

Frontend saat ini sudah memiliki:

- dashboard project;
- editor canvas;
- frame mobile;
- layer panel;
- properties panel;
- component/template tab;
- import/export `.low.json`;
- preview prototype;
- undo/redo;
- autosave localStorage;
- Agent Connect UI.

Backend saat ini masih template FastAPI + MongoDB. Untuk LOW, backend harus direvisi menjadi lebih ringan memakai SQLite.

## Instruksi Implementasi

1. Ganti backend MongoDB menjadi SQLite.
2. Buat struktur backend modular di `backend/app`.
3. Tambahkan migration dengan Alembic.
4. Buat endpoint health.
5. Buat auth lokal sederhana.
6. Buat CRUD project.
7. Buat endpoint load/save document.
8. Buat endpoint autosave.
9. Buat endpoint import/export LOW JSON.
10. Buat tabel awal untuk assets, components, templates.
11. Porting Agent API dari MongoDB ke SQLite.
12. Simpan hash token agent, bukan token asli.
13. Tambahkan test backend untuk project, document, import/export, dan agent action.
14. Jangan implementasikan realtime collaboration.
15. Jangan mengubah besar UI/UX frontend kecuali perlu untuk koneksi API.

## Integrasi Frontend

Ubah storage frontend menjadi adapter:

```txt
src/data/
  storage/
    localStorageStorage.js
    apiStorage.js
    index.js
```

Frontend harus tetap bisa berjalan dalam mode lokal jika backend belum aktif.

Tambahkan state UI:

- Saved locally
- Syncing
- Saved to server
- Offline
- Sync failed

## Revisi UI Kecil

Pastikan gaya monochrome tetap konsisten:

- ganti semua `#2563eb` menjadi warna hitam/abu gelap;
- ganti indikator connected biru menjadi hitam/abu;
- hindari warna aksen lain.

## Kriteria Selesai

Phase 1 selesai jika:

- backend bisa dijalankan lokal;
- database SQLite dibuat otomatis/melalui migration;
- frontend bisa membuat project di backend;
- frontend bisa membuka project dari backend;
- editor bisa save/autosave document ke backend;
- import/export `.low.json` tetap berfungsi;
- Agent Connect tetap bisa start session dan menerima action;
- test backend lulus;
- build frontend tidak error.

## Batasan

Jangan kerjakan:

- realtime collaboration;
- billing;
- SaaS multi-tenant kompleks;
- marketplace;
- import Figma/Penpot penuh;
- AI generation sungguhan;
- screenshot to editable layer;
- deployment production final.
