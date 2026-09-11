import asyncio
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import init_db
from app.core.config import settings


async def main():
    print("Resetting development database...")
    db_file = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
    if os.path.exists(db_file):
        os.remove(db_file)
        print(f"Removed old database file: {db_file}")

    print("Re-initializing schema and seed data...")
    await init_db()
    print("Development database reset successfully.")


if __name__ == "__main__":
    asyncio.run(main())
