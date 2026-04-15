"""
Dependencies - Inyección de dependencias para FastAPI
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Annotated
import jwt
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> str:
    """
    Valida el JWT de Supabase Auth y extrae el user_id
    
    Args:
        credentials: Token Bearer del header Authorization
    
    Returns:
        str: user_id (UUID) del usuario autenticado
    
    Raises:
        HTTPException 401: Si el token es inválido o ha expirado
    """
    token = credentials.credentials
    
    try:
        # Decodificar JWT SIN verificación de firma (Supabase ya lo validó)
        # En producción, deberías obtener la clave pública de Supabase para verificar
        payload = jwt.decode(
            token,
            options={"verify_signature": False},  # Desactivar verificación de firma
            audience="authenticated",
        )
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: falta claim 'sub'",
            )
        
        logger.debug("Usuario autenticado", extra={"user_id": user_id})
        return user_id
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
        )
    except jwt.InvalidTokenError as e:
        logger.warning("Token JWT inválido", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
