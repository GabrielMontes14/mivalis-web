"""
Products Router - CRUD operations for products
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional

from ..database import get_db
from ..models import Product, Category, User
from ..auth_utils import get_current_user
from ..schemas import (
    ProductCreate, 
    ProductUpdate, 
    ProductResponse, 
    ProductSearchResult,
    CategoryResponse
)

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=List[ProductResponse])
async def get_products(
    skip: int = 0,
    limit: int = 50,
    category_id: Optional[int] = None,
    condition: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    supplier: Optional[str] = None,
    low_stock: Optional[bool] = False,
    show_hidden: Optional[bool] = False,
    featured: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all products with optional filters and search"""
    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.tiered_pricing)
    )
    
    if category_id:
        query = query.where(Product.category_id == category_id)
    if condition:
        query = query.where(Product.condition == condition)
        
    # Status Filtering Logic
    # Default is_active=True (Active products only)
    # If show_hidden=True, we ignore is_active filter (Show All)
    # If explicit is_active is passed (e.g. False), it is respected unless show_hidden is True
    if not show_hidden:
        if is_active is not None:
            query = query.where(Product.is_active == is_active)
    
    if brand:
        query = query.where(func.lower(Product.brand).contains(brand.lower()))
    if model:
        query = query.where(func.lower(Product.model).contains(model.lower()))
    if supplier:
        query = query.where(func.lower(Product.supplier).contains(supplier.lower()))
    
    if low_stock:
        # Assuming low stock is < 10, similar to the low-stock endpoint default
        query = query.where(Product.stock < 10)
    
    if featured is not None:
        query = query.where(Product.is_featured == featured)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(Product.name).like(search_term),
                func.lower(Product.brand).like(search_term),
                func.lower(Product.model).like(search_term)
            )
        )
    
    query = query.offset(skip).limit(limit).order_by(Product.id.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/low-stock")
async def get_low_stock_products(
    threshold: int = Query(default=10, ge=1, description="Stock threshold"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get products with stock below threshold (for alerts)"""
    query = (
        select(Product.id, Product.name, Product.stock, Product.supplier)
        .where(Product.is_active == True)
        .where(Product.stock < threshold)
        .order_by(Product.stock.asc())
        .limit(20)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "id": row.id,
            "name": row.name,
            "stock": row.stock,
            "supplier": row.supplier
        }
        for row in rows
    ]


@router.get("/search", response_model=List[ProductSearchResult])
async def search_products(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """Search products by name, brand, or model"""
    search_term = f"%{q.lower()}%"
    
    query = (
        select(
            Product.id,
            Product.name,
            Product.brand,
            Product.model,
            Product.price,
            Product.stock,
            Product.condition,
            Category.name.label("category_name")
        )
        .outerjoin(Category, Product.category_id == Category.id)
        .where(
            Product.is_active == True,
            or_(
                func.lower(Product.name).like(search_term),
                func.lower(Product.brand).like(search_term),
                func.lower(Product.model).like(search_term)
            )
        )
        .limit(limit)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        ProductSearchResult(
            id=row.id,
            name=row.name,
            brand=row.brand,
            model=row.model,
            price=row.price,
            stock=row.stock,
            condition=row.condition,
            category_name=row.category_name
        )
        for row in rows
    ]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single product by ID"""
    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.tiered_pricing)
    ).where(Product.id == product_id)
    result = await db.execute(query)
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return product


@router.post("", response_model=ProductResponse, status_code=201)
async def create_product(
    product: ProductCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new product"""
    db_product = Product(**product.model_dump())
    db.add(db_product)
    await db.commit()
    await db.refresh(db_product)
    
    # Load category relationship
    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.tiered_pricing)
    ).where(Product.id == db_product.id)
    result = await db.execute(query)
    return result.scalar_one()


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing product"""
    from ..models import PriceHistory
    
    query = select(Product).where(Product.id == product_id)
    result = await db.execute(query)
    db_product = result.scalar_one_or_none()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    update_data = product_update.model_dump(exclude_unset=True)
    
    # Track price changes for audit
    old_price = float(db_product.price) if db_product.price else None
    old_cost = float(db_product.cost_price) if db_product.cost_price else None
    new_price = float(update_data.get('price')) if 'price' in update_data and update_data['price'] else None
    new_cost = float(update_data.get('cost_price')) if 'cost_price' in update_data and update_data['cost_price'] else None
    
    price_changed = new_price is not None and old_price != new_price
    cost_changed = new_cost is not None and old_cost != new_cost
    
    # Apply updates
    for field, value in update_data.items():
        setattr(db_product, field, value)
    
    # Log price change if any
    if price_changed or cost_changed:
        change_type = "both" if (price_changed and cost_changed) else ("price_update" if price_changed else "cost_update")
        price_log = PriceHistory(
            product_id=product_id,
            user_id=current_user.id,
            old_price=old_price,
            new_price=new_price if price_changed else old_price,
            old_cost=old_cost,
            new_cost=new_cost if cost_changed else old_cost,
            change_type=change_type
        )
        db.add(price_log)
    
    await db.commit()
    await db.refresh(db_product)
    
    # Load category relationship
    query = select(Product).options(
        selectinload(Product.category),
        selectinload(Product.tiered_pricing)
    ).where(Product.id == db_product.id)
    result = await db.execute(query)
    return result.scalar_one()


@router.put("/{product_id}/featured")
async def toggle_product_featured(
    product_id: int,
    is_featured: bool = Query(..., description="Set featured status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle product featured status"""
    query = select(Product).where(Product.id == product_id)
    result = await db.execute(query)
    db_product = result.scalar_one_or_none()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    db_product.is_featured = is_featured
    await db.commit()
    await db.refresh(db_product)
    
    return {"message": "Estado destacado actualizado", "is_featured": db_product.is_featured}


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a product (soft delete by setting is_active=False)"""
    query = select(Product).where(Product.id == product_id)
    result = await db.execute(query)
    db_product = result.scalar_one_or_none()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    db_product.is_active = False
    await db.commit()
    return None


@router.get("/{product_id}/price-history")
async def get_price_history(
    product_id: int,
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get price change history for a product (for auditing)"""
    from ..models import PriceHistory
    
    # First check product exists
    product = await db.execute(select(Product.name).where(Product.id == product_id))
    product_data = product.scalar_one_or_none()
    if not product_data:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Get price history with user info
    from ..models import User as UserModel
    query = (
        select(
            PriceHistory.id,
            PriceHistory.old_price,
            PriceHistory.new_price,
            PriceHistory.old_cost,
            PriceHistory.new_cost,
            PriceHistory.change_type,
            PriceHistory.created_at,
            UserModel.username
        )
        .outerjoin(UserModel, PriceHistory.user_id == UserModel.id)
        .where(PriceHistory.product_id == product_id)
        .order_by(PriceHistory.created_at.desc())
        .limit(limit)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    return {
        "product_name": product_data,
        "history": [
            {
                "id": row.id,
                "old_price": float(row.old_price) if row.old_price else None,
                "new_price": float(row.new_price) if row.new_price else None,
                "old_cost": float(row.old_cost) if row.old_cost else None,
                "new_cost": float(row.new_cost) if row.new_cost else None,
                "change_type": row.change_type,
                "changed_by": row.username,
                "changed_at": row.created_at.isoformat() if row.created_at else None
            }
            for row in rows
        ]
    }


# ============ Categories Endpoints ============
@router.get("/categories/all", response_model=List[CategoryResponse])
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get all categories"""
    query = select(Category).order_by(Category.name)
    result = await db.execute(query)
    return result.scalars().all()
