# LOW Backup & Disaster Recovery Guide

Because LOW utilizes SQLite, taking full consistent snapshots is straightforward, atomic, and can be completed while the application is live without downtime.

---

## 1. Quick Backup

### Using the Python CLI Helper
Run from repository root or backend:
```bash
python backend/scripts/backup.py
```
This uses SQLite's native online backup API (`sqlite3.Connection.backup`) to create a consistent, uncorrupted snapshot in `backups/low_backup_YYYYMMDD_HHMMSS.db`.

### Using the SQLite3 CLI
```bash
sqlite3 data/low.db ".backup 'backups/low_backup_manual.db'"
```

### Backing up inside Docker
```bash
docker compose exec backend python scripts/backup.py
```

---

## 2. Asset Storage Backup

In addition to the database file, user-uploaded image assets are stored in the asset storage directory:
- Local dev: `./storage/assets/`
- Docker: `./data/uploads/`

To backup both database and assets into a single archive:
```bash
tar -czvf low_full_backup_$(date +%Y%m%d).tar.gz data/low.db data/uploads/
```

---

## 3. Disaster Recovery / Restore Process

To restore from a backup:

1. Stop the application services to prevent conflicting writes:
   ```bash
   docker compose down
   # Or stop local uvicorn process
   ```

2. Replace the active database file with your chosen backup:
   ```bash
   # Docker setup:
   cp backups/low_backup_20260911_102542.db data/low.db

   # Local development setup:
   cp backups/low_backup_20260911_102542.db low.db
   ```

3. If restoring assets, extract them to the upload directory:
   ```bash
   tar -xzvf uploads_backup.tar.gz -C data/
   ```

4. Restart the containers or server:
   ```bash
   docker compose up -d
   ```

5. Verify database integrity:
   ```bash
   sqlite3 data/low.db "PRAGMA integrity_check;"
   ```
   Should output: `ok`.
