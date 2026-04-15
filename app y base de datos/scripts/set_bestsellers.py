import asyncio
import random
import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, update
from app.database import async_session_maker
from app.models import Product

async def set_random_bestsellers():
    print("Connecting to database...")
    async with async_session_maker() as db:
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
