"""
SQLAlchemy Models for Bodega Mayorista
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, DECIMAL
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()


class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    icon = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"))
    brand = Column(String(100))
    model = Column(String(100))  # Modelo del producto
    unit = Column(String(50), default="unidad")
    cost_price = Column(DECIMAL(10, 2))  # Precio de costo (compra)
    price = Column(DECIMAL(10, 2))  # Precio de venta público
    wholesale_price = Column(DECIMAL(10, 2))  # Precio mayorista
    min_wholesale_qty = Column(Integer, default=12)
    stock = Column(Integer, default=0)
    supplier = Column(String(200))  # Proveedor
    condition = Column(String(50), default="new")  # new, used, refurbished
    description = Column(Text)
    image_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)  # Producto destacado para carrusel
    color = Column(String(50))  # Color del producto (ej: Azul, Rojo)
    storage = Column(String(50))  # Capacidad (ej: 128GB, 256GB)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    category = relationship("Category", back_populates="products")
    tiered_pricing = relationship("TieredPricing", back_populates="product", cascade="all, delete-orphan")


class TieredPricing(Base):
    __tablename__ = "tiered_pricing"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"))
    min_quantity = Column(Integer, nullable=False)
    price_per_unit = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="tiered_pricing")


class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    hashed_password = Column(String(200), nullable=False)
    business_name = Column(String(200), nullable=False)
    contact_name = Column(String(200))
    phone = Column(String(50))
    address = Column(Text)
    city = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    role = Column(String(20), default="retail")
    reset_token = Column(String(100), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    orders = relationship("Order", back_populates="customer")


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    status = Column(String(30), default="pendiente")
    subtotal = Column(DECIMAL(12, 2), nullable=False)
    discount = Column(DECIMAL(12, 2), default=0)
    total = Column(DECIMAL(12, 2), nullable=False)
    notes = Column(Text)
    delivery_address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"))
    product_id = Column(Integer, ForeignKey("products.id"))
    product_name = Column(String(200), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(DECIMAL(10, 2), nullable=False)
    subtotal = Column(DECIMAL(12, 2), nullable=False)
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product")


class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String(20), nullable=False)
    sender_id = Column(String(100), nullable=False)
    sender_name = Column(String(200))
    status = Column(String(20), default="active")
    escalated_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    messages = relationship("Message", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    sender_type = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(20), default="employee")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Payment(Base):
    """Tracks all payment transactions (Wompi and manual transfers)"""
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    payment_method = Column(String(50), nullable=False)  # card, nequi, bancolombia
    status = Column(String(30), default="pending")  # pending, approved, rejected, failed
    amount = Column(DECIMAL(12, 2), nullable=False)
    
    # Wompi transaction data
    wompi_transaction_id = Column(String(100), unique=True, nullable=True)
    wompi_reference = Column(String(100), nullable=True)
    wompi_status = Column(String(50), nullable=True)
    
    # Manual transfer data (Bancolombia)
    transfer_proof_url = Column(String(500), nullable=True)  # URL del comprobante
    transfer_reference = Column(String(100), nullable=True)  # Referencia del cliente
    verified_by_admin = Column(Boolean, default=False)
    admin_notes = Column(Text, nullable=True)
    
    # Metadata
    payment_data = Column(Text, nullable=True)  # JSON con datos adicionales
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    order = relationship("Order", back_populates="payments")


class PriceHistory(Base):
    """Tracks price changes for products for auditing purposes"""
    __tablename__ = "price_history"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    old_price = Column(DECIMAL(10, 2))
    new_price = Column(DECIMAL(10, 2))
    old_cost = Column(DECIMAL(10, 2))
    new_cost = Column(DECIMAL(10, 2))
    
    change_type = Column(String(50))  # 'price_update', 'cost_update', 'both'
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product")
    user = relationship("User")


class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient = Column(String(200), nullable=False)
    subject = Column(String(200), nullable=False)
    template_name = Column(String(100))
    status = Column(String(50), default="pending")
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

