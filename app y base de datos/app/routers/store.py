"""
Store Router - Public catalog for customers
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional

from ..database import get_db
from ..models import Product, Category, TieredPricing
from ..schemas import ProductCatalogResponse, CategoryResponse

router = APIRouter(prefix="/store", tags=["store"])


@router.get("/products", response_model=List[ProductCatalogResponse])
async def get_catalog_products(
    skip: int = 0,
    limit: int = 50,
    category_id: Optional[int] = None,
    search: Optional[str] = Query(None, min_length=1),
    db: AsyncSession = Depends(get_db)
):
    """Get public product catalog with tiered pricing"""
    query = (
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.tiered_pricing)
        )
        .where(Product.is_active == True)
        # .where(Product.stock > 0)
    )
    
    if category_id:
        query = query.where(Product.category_id == category_id)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.where(
            func.lower(Product.name).like(search_term) |
            func.lower(Product.brand).like(search_term)
        )
    
    query = query.order_by(Product.name).offset(skip).limit(limit)
    result = await db.execute(query)
    products = result.scalars().all()
    
    return products


@router.get("/products/{product_id}", response_model=ProductCatalogResponse)
async def get_catalog_product(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get single product with tiered pricing"""
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.tiered_pricing)
        )
        .where(Product.id == product_id)
        .where(Product.is_active == True)
    )
    product = result.scalar_one_or_none()
    
    if not product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return product


@router.get("/categories", response_model=List[CategoryResponse])
async def get_store_categories(db: AsyncSession = Depends(get_db)):
    """Get all active categories with product count"""
    result = await db.execute(
        select(Category).order_by(Category.name)
    )
    return result.scalars().all()


@router.get("/featured", response_model=List[ProductCatalogResponse])
async def get_featured_products(
    limit: int = 8,
    db: AsyncSession = Depends(get_db)
):
    """Get featured/popular products"""
    query = (
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.tiered_pricing)
        )
        .where(Product.is_active == True)
        .where(Product.is_featured == True)  # Filter by featured flag
        .order_by(Product.updated_at.desc())
        .limit(limit)
    )
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/by-category/{category_id}", response_model=List[ProductCatalogResponse])
async def get_products_by_category(
    category_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Get products by category"""
    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.category),
            selectinload(Product.tiered_pricing)
        )
        .where(Product.is_active == True)
        .where(Product.category_id == category_id)
        # .where(Product.stock > 0)
        .order_by(Product.name)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()
