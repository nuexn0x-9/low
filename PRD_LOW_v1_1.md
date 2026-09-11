# PRD LOW v1.1

## 1. Status Produk

LOW sudah memiliki frontend editor awal yang berjalan sebagai aplikasi desain UI/UX mobile berbasis web. Fokus produk tetap sama: ringan, open-source, self-hostable, monochrome, mudah digunakan, dan dipakai dari desktop/laptop untuk membuat desain mobile app.

PRD v1.1 memperbarui PRD awal berdasarkan frontend yang sudah selesai dibuat.

## 2. Identitas Produk

LOW adalah editor desain dan prototyping UI/UX mobile yang ringan, minimal, dan bisa di-host sendiri. LOW tidak dimulai sebagai alat desain universal untuk semua kebutuhan grafis. LOW dimulai dari kebutuhan yang lebih tajam: membuat screen mobile, komponen UI, template, gesture, transisi, dan prototype interaktif dengan pengalaman yang sederhana.

## 3. Prinsip Desain Resmi

- Monochrome sebagai gaya visual utama.
- Interface padat dan jelas.
- Tidak memakai efek visual berat.
- Tidak memakai asset besar untuk interface editor.
- Panel mengikuti konteks kerja.
- Template dan komponen menjadi pintu masuk utama.
- Fitur AI dan agent harus terasa sebagai alat bantu, bukan pusat interface.

## 4. Fitur yang Sudah Ada di Frontend

| Area | Status |
|---|---|
| Dashboard project | Ada |
| Editor shell | Ada |
| Top toolbar | Ada |
| Left sidebar | Ada |
| Canvas mobile | Ada |
| Right properties panel | Ada |
| Bottom status bar | Ada |
| Component library dummy | Ada |
| Template library dummy | Ada |
| Import `.low.json` | Ada |
| Export `.low.json` | Ada |
| Preview prototype | Ada |
| Undo/redo | Ada |
| Autosave localStorage | Ada |
| Agent Connect UI | Ada |

## 5. Fitur Pembeda

LOW memiliki dua fitur pembeda utama:

| Fitur | Fungsi |
|---|---|
| LOW Import Engine | Mengimpor elemen, komponen, template, dan AI Generated JSON ke format LOW |
| Agent Connect | Mengizinkan agent eksternal membaca dan memodifikasi dokumen melalui API terbatas |

Agent Connect perlu dianggap sebagai fitur eksperimental sampai backend production siap.

## 6. Backend Goal

Backend v1.1 bertujuan memindahkan LOW dari frontend-only/localStorage menjadi aplikasi self-hosted yang menyimpan project dan dokumen secara permanen.

Backend pertama harus menyelesaikan:

- autentikasi lokal;
- penyimpanan project;
- penyimpanan dokumen desain;
- autosave;
- import/export server-side;
- asset upload lokal;
- component library;
- template library;
- agent session eksperimental.

## 7. Batasan Backend v1.1

Backend v1.1 belum perlu mengerjakan:

- realtime collaboration;
- multiplayer cursor;
- marketplace publik;
- import penuh Figma/Penpot;
- image-to-layer AI;
- permission tim kompleks;
- billing;
- deployment SaaS.

## 8. Target Self-hosting

LOW v1.1 harus bisa dijalankan dengan:

- satu frontend build;
- satu backend service;
- SQLite;
- storage folder lokal;
- Docker Compose sederhana.

Target ini sejalan dengan kebutuhan LOW sebagai aplikasi ringan.

## 9. Storage Strategy

Saat ini frontend menyimpan project di `localStorage`. Setelah backend dibuat, strategi transisi:

1. Tambah API client.
2. Load project dari backend jika user login.
3. Simpan autosave ke backend.
4. Simpan fallback localStorage untuk mode demo/offline.
5. Tambah migrasi localStorage ke backend.

## 10. Document Format

Format `.low.json` tetap menjadi pusat produk.

Versi baru menggunakan `lowVersion: 1.1.0` dan tetap mendukung format lama yang berisi `document.frames`.

Backend harus menyimpan dokumen sebagai JSON utuh, lalu menambahkan metadata server seperti project owner, revision, timestamps, dan version snapshots.

## 11. MVP Berikutnya

MVP berikutnya selesai jika:

- user bisa register/login;
- user bisa membuat project dari dashboard;
- project tersimpan di SQLite;
- editor bisa load project dari backend;
- editor bisa autosave ke backend;
- export/import `.low.json` tetap berjalan;
- asset SVG/image bisa diupload;
- component dan template bisa disimpan;
- Agent Connect tetap bisa digunakan melalui backend SQLite.

## 12. Keputusan Revisi

- Backend production LOW memakai SQLite, bukan MongoDB.
- FastAPI boleh dipertahankan karena sudah ada pondasi backend.
- Frontend tetap React.
- Monochrome tetap menjadi style resmi.
- Agent Connect masuk roadmap sebagai fitur pembeda, tetapi harus diamankan.
- Import Engine tetap menjadi inti produk.
