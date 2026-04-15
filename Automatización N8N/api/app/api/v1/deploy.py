"""
Router: Deploy
Endpoints para despliegue y gestión de agentes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated
import logging

from app.schemas.deploy import DeployRequest, DeployResponse
from app.core.dependencies import get_current_user
from app.services.deploy_service import DeployService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/deploy", response_model=DeployResponse, status_code=status.HTTP_201_CREATED)
async def deploy_agent(
    request: DeployRequest,
    user_id: Annotated[str, Depends(get_current_user)],
):
    """
    Despliega un nuevo agente para un cliente
    
    Args:
        request: Configuración del agente a desplegar
        user_id: ID del usuario autenticado (obtenido del JWT)
    
    Returns:
        DeployResponse: Información del agente desplegado
    
    Raises:
        HTTPException 400: Si la plantilla no existe o la configuración es inválida
        HTTPException 402: Si el cliente no tiene créditos suficientes
        HTTPException 404: Si el cliente no existe
        HTTPException 500: Si falla el despliegue después de 3 reintentos
    """
    logger.info(
        "Solicitud de despliegue recibida",
        extra={
            "user_id": user_id,
            "plantilla_ref": request.plantilla_ref,
        },
    )
    
    try:
        result = await DeployService.deploy_agent(
            user_id=user_id,
            plantilla_ref=request.plantilla_ref,
            config_personalizada=request.config_personalizada
        )
        
        logger.info("Despliegue exitoso", extra={
            "agente_id": result["agente_id"],
            "workflow_id": result["workflow_id"]
        })
        
        return DeployResponse(**result)
    
    except ValueError as e:
        error_msg = str(e)
        
        # Determinar el código de error apropiado
        if "no encontrado" in error_msg.lower():
            if "cliente" in error_msg.lower():
                status_code = status.HTTP_404_NOT_FOUND
            else:  # Plantilla no encontrada
                status_code = status.HTTP_400_BAD_REQUEST
        elif "créditos insuficientes" in error_msg.lower() or "sobregiro" in error_msg.lower():
            status_code = status.HTTP_402_PAYMENT_REQUIRED
        else:
            status_code = status.HTTP_400_BAD_REQUEST
        
        logger.warning("Error en despliegue", extra={
            "user_id": user_id,
            "error": error_msg,
            "status_code": status_code
        })
        
        raise HTTPException(
            status_code=status_code,
            detail=error_msg
        )
    
    except Exception as e:
        logger.error("Error crítico en despliegue", extra={
            "user_id": user_id,
            "error": str(e)
        }, exc_info=True)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al desplegar agente: {str(e)}"
        )
