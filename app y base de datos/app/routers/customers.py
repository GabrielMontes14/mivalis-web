"""
Customers Router - Authentication and profile for wholesale customers
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
import os

from ..database import get_db
from ..models import Customer, User
from ..schemas import CustomerCreate, CustomerLogin, CustomerResponse, CustomerToken
from ..auth_utils import get_current_admin
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/customers", tags=["customers"])

# Security
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/customers/login", auto_error=False)

SECRET_KEY = os.getenv("JWT_SECRET", "bodega-mayorista-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7  # Reduced from 30 for security


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Truncate to 72 bytes (bcrypt limit) and encode
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    # Truncate to 72 bytes (bcrypt limit) and encode
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_customer(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[Customer]:
    """Get current authenticated customer"""
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
    
    result = await db.execute(select(Customer).where(Customer.email == email))
    customer = result.scalar_one_or_none()
    
    if customer is None or not customer.is_active:
        return None
    
    return customer


async def require_customer(
    customer: Customer = Depends(get_current_customer)
) -> Customer:
    """Require authenticated customer"""
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Por favor inicie sesión.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return customer


@router.post("/register", response_model=CustomerToken, status_code=status.HTTP_201_CREATED)
async def register_customer(customer_data: CustomerCreate, db: AsyncSession = Depends(get_db)):
    """Register a new wholesale customer"""
    # Check if email already exists
    result = await db.execute(select(Customer).where(Customer.email == customer_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este correo electrónico ya está registrado"
        )
    
    # Create customer
    customer = Customer(
        email=customer_data.email,
        hashed_password=get_password_hash(customer_data.password),
        business_name=customer_data.business_name,
        contact_name=customer_data.contact_name,
        phone=customer_data.phone,
        address=customer_data.address,
        city=customer_data.city
    )
    
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    
    # Create access token
    access_token = create_access_token(data={"sub": customer.email, "type": "customer"})
    
    return CustomerToken(
        access_token=access_token,
        customer=CustomerResponse.model_validate(customer)
    )


@router.post("/login", response_model=CustomerToken)
async def login_customer(login_data: CustomerLogin, db: AsyncSession = Depends(get_db)):
    """Login for wholesale customers"""
    result = await db.execute(select(Customer).where(Customer.email == login_data.email))
    customer = result.scalar_one_or_none()
    
    if not customer or not verify_password(login_data.password, customer.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos"
        )
    
    if not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada. Contacte al administrador."
        )
    
    access_token = create_access_token(data={"sub": customer.email, "type": "customer"})
    
    return CustomerToken(
        access_token=access_token,
        customer=CustomerResponse.model_validate(customer)
    )


@router.get("/me", response_model=CustomerResponse)
async def get_customer_profile(customer: Customer = Depends(require_customer)):
    """Get current customer profile"""
    return customer


@router.put("/me", response_model=CustomerResponse)
async def update_customer_profile(
    update_data: CustomerCreate,
    customer: Customer = Depends(require_customer),
    db: AsyncSession = Depends(get_db)
):
    """Update current customer profile"""
    customer.business_name = update_data.business_name
    customer.contact_name = update_data.contact_name
    customer.phone = update_data.phone
    customer.address = update_data.address
    customer.city = update_data.city
    
    await db.commit()
    await db.refresh(customer)
    
    return customer


# ============================================
# ADMIN ENDPOINTS
# ============================================

class RoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(retail|wholesale)$")


@router.put("/{customer_id}/role")
async def update_customer_role(
    customer_id: int,
    role_data: RoleUpdate,
    admin: User = Depends(get_current_admin),  # Requires admin user (not customer)
    db: AsyncSession = Depends(get_db)
):
    """Admin endpoint to update customer role"""
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    customer.role = role_data.role
    await db.commit()
    
    return {"message": f"Rol actualizado a {role_data.role}", "customer_id": customer.id}


# ============================================
# PASSWORD RECOVERY ENDPOINTS
# ============================================

from pydantic import BaseModel, EmailStr
from fastapi import BackgroundTasks
import uuid

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Send password reset email"""
    # Find customer by email
    result = await db.execute(
        select(Customer).where(Customer.email == request.email)
    )
    customer = result.scalar_one_or_none()
    
    # Always return success (security: don't reveal if email exists)
    if not customer:
        return {"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    token_expires = datetime.utcnow() + timedelta(hours=1)
    
    # Save token to database
    customer.reset_token = reset_token
    customer.reset_token_expires = token_expires
    await db.commit()
    
    # Send email in background
    from ..services.email import email_service
    
    async def send_reset_email():
        reset_link = f"http://localhost:8001/tienda/reset-password.html?token={reset_token}"
        template_body = {
            "business_name": customer.business_name,
            "reset_link": reset_link,
            "year": "2026"
        }
        await email_service.send_email(
            subject="Restablecer tu contraseña - Bodega Mayorista",
            recipients=[customer.email],
            template_name="password_reset.html",
            template_body=template_body
        )
    
    background_tasks.add_task(send_reset_email)
    
    return {"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"}


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Reset password using token"""
    # Find customer by token
    result = await db.execute(
        select(Customer).where(Customer.reset_token == request.token)
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o expirado"
        )
    
    # Check if token expired
    if customer.reset_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace ha expirado. Solicita uno nuevo."
        )
    
    # Update password
    customer.hashed_password = get_password_hash(request.new_password)
    customer.reset_token = None
    customer.reset_token_expires = None
    await db.commit()
    
    return {"message": "Contraseña actualizada exitosamente"}
