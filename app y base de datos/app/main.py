"""
Main FastAPI Application - Bodega Mayorista
"""
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import os

from .database import get_db, async_session
from .models import Product, Category, Conversation, Order
from .routers import products, chatbot, auth, users, customers, orders, store, import_excel, upload, payments
from .schemas import DashboardStats
from .security_middleware import SecurityHeadersMiddleware, RateLimitMiddleware

# Create FastAPI app
app = FastAPI(
    title="Bodega Mayorista API",
    description="API para gestión de inventario, pedidos y chatbot de Bodega Mayorista",
    version="2.0.0",
    docs_url="/api/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/api/redoc" if os.getenv("ENVIRONMENT") != "production" else None
)

# Security middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=10)

# CORS middleware - Restricted to trusted origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:8001,http://localhost:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include routers
# Admin routes
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")

# E-commerce routes
app.include_router(customers.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(payments.router)  # Payments has /api prefix already
app.include_router(import_excel.router, prefix="/api")
app.include_router(store.router, prefix="/api")
app.include_router(upload.router, prefix="/api")

# Mount uploads directory for serving uploaded images
from pathlib import Path
uploads_path = Path("uploads")
uploads_path.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
async def startup_db_check():
    """Ensure database schema is up to date"""
    try:
        from .database import engine
        from sqlalchemy import text
        
        async with engine.begin() as conn:
            # Check if role column exists in customers table
            # If not, add it
            try:
                await conn.execute(text("ALTER TABLE customers ADD COLUMN role VARCHAR(20) DEFAULT 'retail'"))
                print("Applied migration: Added role column to customers")
            except Exception as e:
                pass

            # Check if is_featured column exists in products table
            try:
                await conn.execute(text("ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE"))
                print("Applied migration: Added is_featured column to products")
            except Exception as e:
                pass

            # Check if color column exists
            try:
                await conn.execute(text("ALTER TABLE products ADD COLUMN color VARCHAR(50)"))
                print("Applied migration: Added color column to products")
            except Exception as e:
                pass

            # Check if storage column exists
            try:
                await conn.execute(text("ALTER TABLE products ADD COLUMN storage VARCHAR(50)"))
                print("Applied migration: Added storage column to products")
            except Exception as e:
                pass
    except Exception as e:
        print(f"Startup DB check failed: {e}")


# ============ Health Check ============
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "bodega-mayorista-api"}


# ============ Dashboard Stats ============
@app.get("/api/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    async with async_session() as db:
        # Total products
        total_products = await db.execute(select(func.count(Product.id)))
        total_products = total_products.scalar()
        
        # Active products
        active_products = await db.execute(
            select(func.count(Product.id)).where(Product.is_active == True)
        )
        active_products = active_products.scalar()
        
        # Low stock (less than 10)
        low_stock = await db.execute(
            select(func.count(Product.id)).where(
                Product.is_active == True,
                Product.stock < 10
            )
        )
        low_stock = low_stock.scalar()
        
        # Total categories
        total_categories = await db.execute(select(func.count(Category.id)))
        total_categories = total_categories.scalar()
        
        # Active conversations
        active_convs = await db.execute(
            select(func.count(Conversation.id)).where(Conversation.status == "active")
        )
        active_convs = active_convs.scalar()
        
        # Escalated conversations
        escalated_convs = await db.execute(
            select(func.count(Conversation.id)).where(Conversation.status == "escalated")
        )
        escalated_convs = escalated_convs.scalar()
        
        # Pending orders
        pending_orders = await db.execute(
            select(func.count(Order.id)).where(Order.status == "pendiente")
        )
        pending_orders = pending_orders.scalar()
        
        # Total orders
        total_orders = await db.execute(select(func.count(Order.id)))
        total_orders = total_orders.scalar()
        
        return DashboardStats(
            total_products=total_products or 0,
            active_products=active_products or 0,
            low_stock_products=low_stock or 0,
            total_categories=total_categories or 0,
            active_conversations=active_convs or 0,
            escalated_conversations=escalated_convs or 0,
            pending_orders=pending_orders or 0,
            total_orders=total_orders or 0
        )


# ============ Economy Stats ============
@app.get("/api/stats/economy")
async def get_economy_stats():
    """Get economy/financial statistics for the dashboard"""
    from datetime import datetime, timedelta
    from sqlalchemy import cast, Date
    from .models import OrderItem
    
    async with async_session() as db:
        today = datetime.utcnow().date()
        
        # Today's completed orders (not cancelled)
        valid_statuses = ["confirmado", "preparando", "enviado", "entregado"]
        
        # Today's sales (total revenue)
        today_sales = await db.execute(
            select(func.sum(Order.total))
            .where(cast(Order.created_at, Date) == today)
            .where(Order.status.in_(valid_statuses))
        )
        today_sales = float(today_sales.scalar() or 0)
        
        # Today's order count
        today_orders = await db.execute(
            select(func.count(Order.id))
            .where(cast(Order.created_at, Date) == today)
            .where(Order.status.in_(valid_statuses))
        )
        today_orders = today_orders.scalar() or 0
        
        # Today's costs (sum of cost_price * quantity for items in today's orders)
        today_costs_result = await db.execute(
            select(func.sum(OrderItem.quantity * Product.cost_price))
            .join(Order, OrderItem.order_id == Order.id)
            .join(Product, OrderItem.product_id == Product.id)
            .where(cast(Order.created_at, Date) == today)
            .where(Order.status.in_(valid_statuses))
        )
        today_costs = float(today_costs_result.scalar() or 0)
        
        # Today's profit
        today_profit = today_sales - today_costs
        
        # This week stats
        week_start = today - timedelta(days=today.weekday())
        week_sales = await db.execute(
            select(func.sum(Order.total))
            .where(cast(Order.created_at, Date) >= week_start)
            .where(Order.status.in_(valid_statuses))
        )
        week_sales = float(week_sales.scalar() or 0)
        
        # This month stats
        month_start = today.replace(day=1)
        month_sales = await db.execute(
            select(func.sum(Order.total))
            .where(cast(Order.created_at, Date) >= month_start)
            .where(Order.status.in_(valid_statuses))
        )
        month_sales = float(month_sales.scalar() or 0)
        
        # Cancelled/returned orders today (potential losses)
        cancelled_today = await db.execute(
            select(func.sum(Order.total))
            .where(cast(Order.created_at, Date) == today)
            .where(Order.status == "cancelado")
        )
        cancelled_today = float(cancelled_today.scalar() or 0)
        
        return {
            "today": {
                "sales": today_sales,
                "costs": today_costs,
                "profit": today_profit,
                "orders": today_orders,
                "cancelled": cancelled_today
            },
            "week": {
                "sales": week_sales
            },
            "month": {
                "sales": month_sales
            },
            "last_updated": datetime.utcnow().isoformat()
        }


# ============ Serve Frontend ============
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    # Mount static files for admin
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")
    
    # Check if tienda folder exists
    tienda_path = os.path.join(frontend_path, "tienda")
    if os.path.exists(tienda_path):
        app.mount("/tienda-static", StaticFiles(directory=tienda_path), name="tienda-static")

    @app.get("/")
    @app.get("/index.html")
    async def serve_admin():
        """Serve the admin frontend"""
        return FileResponse(os.path.join(frontend_path, "index.html"))
    
    @app.get("/tienda")
    @app.get("/tienda/")
    async def serve_store():
        """Serve the store frontend"""
        tienda_index = os.path.join(frontend_path, "tienda", "index.html")
        if os.path.exists(tienda_index):
            return FileResponse(tienda_index)
        return {"message": "Tienda frontend not found"}
    
    @app.get("/tienda/{path:path}")
    async def serve_store_pages(path: str):
        """Serve store pages"""
        tienda_path = os.path.join(frontend_path, "tienda", path)
        if os.path.exists(tienda_path) and os.path.isfile(tienda_path):
            return FileResponse(tienda_path)
        # Try to serve index.html for SPA routing
        tienda_index = os.path.join(frontend_path, "tienda", "index.html")
        if os.path.exists(tienda_index):
            return FileResponse(tienda_index)
        return JSONResponse({"error": "File not found"}, status_code=404)


# ============ Error Handlers ============
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler - hides details in production"""
    import logging
    logging.error(f"Unhandled exception: {type(exc).__name__}: {exc}")
    
    # In production, don't expose error details
    if os.getenv("ENVIRONMENT") == "production":
        return JSONResponse(
            status_code=500,
            content={"detail": "Error interno del servidor. Por favor intente más tarde."}
        )
    
    # In development, show full error for debugging
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__}
    )
