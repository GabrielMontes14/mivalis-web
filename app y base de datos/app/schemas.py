"""
Pydantic Schemas for Bodega Mayorista
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ============================================
# Category Schemas
# ============================================
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True


# ============================================
# Tiered Pricing Schemas
# ============================================
class TieredPricingBase(BaseModel):
    min_quantity: int
    price_per_unit: Decimal


class TieredPricingResponse(TieredPricingBase):
    id: int

    class Config:
        from_attributes = True


# ============================================
# Product Schemas
# ============================================
class ProductBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    unit: str = "unidad"
    cost_price: Optional[Decimal] = None  # Precio de costo
    price: Optional[Decimal] = None  # Precio de venta
    wholesale_price: Optional[Decimal] = None
    min_wholesale_qty: int = 12
    stock: int = 0
    supplier: Optional[str] = None  # Proveedor
    condition: str = "new"  # new, used, refurbished
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_featured: bool = False
    color: Optional[str] = None
    storage: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    unit: Optional[str] = None
    cost_price: Optional[Decimal] = None
    price: Optional[Decimal] = None
    wholesale_price: Optional[Decimal] = None
    min_wholesale_qty: Optional[int] = None
    stock: Optional[int] = None
    supplier: Optional[str] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    color: Optional[str] = None
    storage: Optional[str] = None


class ProductResponse(ProductBase):
    id: int
    is_active: bool
    created_at: datetime
    category: Optional[CategoryResponse] = None
    tiered_pricing: List[TieredPricingResponse] = []

    class Config:
        from_attributes = True


class ProductSearchResult(BaseModel):
    id: int
    name: str
    brand: Optional[str]
    unit: str
    price: Decimal
    wholesale_price: Optional[Decimal]
    stock: int
    category_name: Optional[str]


class ProductCatalogResponse(BaseModel):
    """Product for public catalog with pricing tiers"""
    id: int
    name: str
    brand: Optional[str]
    unit: str
    price: Decimal
    wholesale_price: Optional[Decimal]
    min_wholesale_qty: int
    stock: int
    description: Optional[str]
    image_url: Optional[str]
    category: Optional[CategoryResponse]
    tiered_pricing: List[TieredPricingResponse] = []

    class Config:
        from_attributes = True


# ============================================
# Customer Schemas
# ============================================
class CustomerBase(BaseModel):
    email: EmailStr
    business_name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None


class CustomerCreate(CustomerBase):
    password: str = Field(..., min_length=6)


class CustomerLogin(BaseModel):
    email: EmailStr
    password: str


class CustomerResponse(CustomerBase):
    id: int
    is_active: bool
    is_verified: bool
    role: str = "retail"
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer: CustomerResponse


# ============================================
# Order Schemas
# ============================================
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    notes: Optional[str] = None
    delivery_address: Optional[str] = None


class OrderResponse(BaseModel):
    id: int
    order_number: str
    status: str
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    notes: Optional[str]
    delivery_address: Optional[str]
    created_at: datetime
    items: List[OrderItemResponse] = []
    customer: Optional[CustomerResponse] = None

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pendiente|confirmado|preparando|enviado|entregado|cancelado)$")


# ============================================
# Cart Schemas (for frontend)
# ============================================
class CartItem(BaseModel):
    product_id: int
    name: str
    quantity: int
    unit_price: Decimal
    image_url: Optional[str]


class CartSummary(BaseModel):
    items: List[CartItem]
    subtotal: Decimal
    discount: Decimal
    total: Decimal


# ============================================
# Dashboard Stats
# ============================================
class DashboardStats(BaseModel):
    total_products: int = 0
    active_products: int = 0
    low_stock_products: int = 0
    total_categories: int = 0
    active_conversations: int = 0
    escalated_conversations: int = 0
    pending_orders: int = 0
    total_orders: int = 0


# ============================================
# User Schemas (Admin)
# ============================================
class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str
    role: str = "employee"


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# ============================================
# Chatbot Schemas
# ============================================
class ChatMessage(BaseModel):
    message: str
    sender_id: Optional[str] = "web_test"
    platform: str = "web"


class ChatResponse(BaseModel):
    response: str
    conversation_id: Optional[int] = None


class ChatbotQuery(BaseModel):
    """Query for chatbot test endpoint"""
    query: str
    sender_id: Optional[str] = "test_user"
    platform: str = "web"


class ChatbotResponse(BaseModel):
    """Response from chatbot"""
    message: str
    products: List[ProductSearchResult] = []
    should_escalate: bool = False
    escalation_reason: Optional[str] = None


class ConversationResponse(BaseModel):
    id: int
    platform: str
    sender_id: str
    sender_name: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    sender_type: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
