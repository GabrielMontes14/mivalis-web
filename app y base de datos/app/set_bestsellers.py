import asyncio
import random
import sys
import os

# Add parent directory to path to import app modules
# Inside docker, /app/app is where this script is, so we need /app in path? 
# or if we run as python app/set_bestsellers.py from /app workdir...
# We need to make sure we can import app.database etc.

# Usually inside container WORKDIR is /app. 
# app package is at /app/app.
# So "import app.database" should work if we are running from /app.

from app.database import async_session
from app.models import Product
from sqlalchemy import select, update

async def set_random_bestsellers():
    print("Connecting to database...")
    async with async_session() as db:
        # Reset all featured products first
        print("Resetting current featured products...")
        await db.execute(update(Product).values(is_featured=False))
        
        # Get all active product IDs
        result = await db.execute(select(Product.id).where(Product.is_active == True))
        all_ids = result.scalars().all()
        
        if not all_ids:
            print("No active products found!")
            return

        # Select 20 random IDs
        count = min(len(all_ids), 20)
        selected_ids = random.sample(all_ids, count)
        
        print(f"Selected {len(selected_ids)} products to be featured.")
        
        # Update selected products
        await db.execute(
            update(Product)
            .where(Product.id.in_(selected_ids))
            .values(is_featured=True)
        )
        
        await db.commit()
        print("Successfully updated bestsellers!")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(set_random_bestsellers())
