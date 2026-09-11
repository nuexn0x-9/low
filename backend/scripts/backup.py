import os
import sys
import sqlite3
from datetime import datetime

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings


def backup():
    db_file = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
    if not os.path.exists(db_file):
        print(f"Database file not found at {db_file}")
        sys.exit(1)

    backup_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backups"))
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"low_backup_{timestamp}.db")

    print(f"Backing up {db_file} to {backup_file}...")
    source = sqlite3.connect(db_file)
    dest = sqlite3.connect(backup_file)
    with dest:
        source.backup(dest)
    dest.close()
    source.close()

    size_kb = os.path.getsize(backup_file) / 1024
    print(f"Backup completed successfully: {backup_file} ({size_kb:.2f} KB)")


if __name__ == "__main__":
    backup()
