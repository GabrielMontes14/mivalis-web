"""
Users Router - User management (Admin only)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import User
from ..auth_utils import get_current_admin, get_password_hash

router = APIRouter(prefix="/users", tags=["users"])

# Schemas
class UserBase(BaseModel):
    username: str
    role: str = "employee"
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Endpoints
@router.get("", response_model=List[UserResponse])
async def get_users(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """List all users (Admin only)"""
    query = select(User).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=UserResponse)
async def create_user(
    user: UserCreate, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Create new user (Admin only)"""
    # Check if exists
    query = select(User).where(User.username == user.username)
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        hashed_password=hashed_password,
        role=user.role,
        is_active=user.is_active
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Delete User (Admin only)"""
    # Prevent deleting yourself
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
        
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    await db.delete(user)
    await db.commit()
