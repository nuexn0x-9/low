import asyncio
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import init_db


async def main():
    print("Seeding LOW database...")
    await init_db()
    print("Database seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(main())
