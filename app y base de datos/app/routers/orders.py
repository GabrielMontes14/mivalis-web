"""
Orders Router - Order management for wholesale customers
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import uuid

from ..database import get_db
from ..models import Order, OrderItem, Product, Customer, TieredPricing, User
from ..schemas import OrderCreate, OrderResponse, OrderStatusUpdate, OrderItemResponse
from .customers import require_customer, get_current_customer
from ..auth_utils import get_current_user
from fastapi import BackgroundTasks
from ..services.email import email_service

router = APIRouter(prefix="/orders", tags=["orders"])

# Store last check time per user session (simple in-memory, resets on restart)
last_order_check: dict = {}


@router.get("/new-count")
async def get_new_orders_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get count of new pending orders (for notifications)"""
    from datetime import timedelta
    
    # Get pending orders created in the last hour
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    
    result = await db.execute(
        select(func.count(Order.id))
        .where(Order.status == "pendiente")
        .where(Order.created_at >= one_hour_ago)
    )
    new_pending = result.scalar() or 0
    
    # Get total pending orders
    total_pending = await db.execute(
        select(func.count(Order.id))
        .where(Order.status == "pendiente")
    )
    total_pending = total_pending.scalar() or 0
    
    return {
        "new_orders": new_pending,
        "total_pending": total_pending,
        "checked_at": datetime.utcnow().isoformat()
    }


def generate_order_number() -> str:
    """Generate unique order number"""
    timestamp = datetime.now().strftime("%Y%m%d")
    unique_id = uuid.uuid4().hex[:6].upper()
    return f"BOD-{timestamp}-{unique_id}"


async def calculate_price_for_quantity(db: AsyncSession, product_id: int, quantity: int, base_price: float) -> float:
    """Calculate unit price based on quantity tiers"""
    # Get tiered pricing
    result = await db.execute(
        select(TieredPricing)
        .where(TieredPricing.product_id == product_id)
        .where(TieredPricing.min_quantity <= quantity)
        .order_by(TieredPricing.min_quantity.desc())
    )
    tier = result.scalars().first()
    
    if tier:
        return float(tier.price_per_unit)
    
    return float(base_price)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    customer: Customer = Depends(require_customer)
):
    """Create a new order"""
    if not order_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El pedido debe tener al menos un producto"
        )
    
    # Calculate order totals
    subtotal = 0
    order_items = []
    
    for item in order_data.items:
        # Get product
        result = await db.execute(select(Product).where(Product.id == item.product_id))
        product = result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto {item.product_id} no encontrado"
            )
        
        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Producto '{product.name}' no está disponible"
            )
        
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stock insuficiente para '{product.name}'. Disponible: {product.stock}"
            )
        
        # Calculate price with tiered pricing
        unit_price = await calculate_price_for_quantity(
            db, product.id, item.quantity, float(product.price)
        )
        item_subtotal = unit_price * item.quantity
        subtotal += item_subtotal
        
        order_items.append({
            "product_id": product.id,
            "product_name": product.name,
            "quantity": item.quantity,
            "unit_price": unit_price,
            "subtotal": item_subtotal
        })
        
        # Update stock
        product.stock -= item.quantity
    
    # Create order
    order = Order(
        order_number=generate_order_number(),
        customer_id=customer.id,
        subtotal=subtotal,
        discount=0,
        total=subtotal,
        notes=order_data.notes,
        delivery_address=order_data.delivery_address or customer.address
    )
    
    db.add(order)
    await db.flush()
    
    # Create order items
    for item_data in order_items:
        order_item = OrderItem(order_id=order.id, **item_data)
        db.add(order_item)
    
    await db.commit()
    
    # Load complete order with relationships
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.customer))
        .where(Order.id == order.id)
    )
    new_order = result.scalar_one()
    
    # Send confirmation email
    background_tasks.add_task(email_service.send_order_confirmation, new_order, customer)
    
    return new_order


@router.get("", response_model=List[OrderResponse])
async def get_customer_orders(
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    customer: Customer = Depends(require_customer)
):
    """Get orders for current customer"""
    query = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.customer_id == customer.id)
    )
    
    if status_filter:
        query = query.where(Order.status == status_filter)
    
    query = query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/all", response_model=List[OrderResponse])
async def get_all_orders(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all orders (admin only)"""
    query = select(Order).options(
        selectinload(Order.items),
        selectinload(Order.customer)
    )
    
    if status_filter:
        query = query.where(Order.status == status_filter)
    
    query = query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    customer: Optional[Customer] = Depends(get_current_customer)
):
    """Get order details"""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.customer))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    # Check authorization
    if customer and order.customer_id != customer.id:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    return order


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update order status (admin only)"""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    order.status = status_update.status
    order.updated_at = datetime.utcnow()
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.customer))
        .where(Order.id == order_id)
    )
    return result.scalar_one()


@router.get("/stats/summary")
async def get_order_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get order statistics (admin only)"""
    # Pending orders
    pending = await db.execute(
        select(func.count(Order.id)).where(Order.status == "pendiente")
    )
    
    # Total orders
    total = await db.execute(select(func.count(Order.id)))
    
    # Total revenue
    revenue = await db.execute(
        select(func.sum(Order.total)).where(Order.status.in_(["confirmado", "preparando", "enviado", "entregado"]))
    )
    
    return {
        "pending_orders": pending.scalar() or 0,
        "total_orders": total.scalar() or 0,
        "total_revenue": float(revenue.scalar() or 0)
    }


@router.get("/stats/daily")
async def get_daily_sales(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get daily sales statistics for the last N days (admin only)"""
    from sqlalchemy import cast, Date
    from datetime import datetime, timedelta
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Query: Group by date, count orders, sum totals
    result = await db.execute(
        select(
            cast(Order.created_at, Date).label("date"),
            func.count(Order.id).label("order_count"),
            func.sum(Order.total).label("total_sales")
        )
        .where(Order.created_at >= start_date)
        .where(Order.status.in_(["confirmado", "preparando", "enviado", "entregado"]))
        .group_by(cast(Order.created_at, Date))
        .order_by(cast(Order.created_at, Date).desc())
    )
    
    rows = result.all()
    
    return {
        "period_days": days,
        "data": [
            {
                "date": str(row.date),
                "order_count": row.order_count,
                "total_sales": float(row.total_sales or 0)
            }
            for row in rows
        ]
    }
