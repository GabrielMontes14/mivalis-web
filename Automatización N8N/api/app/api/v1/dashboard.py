"""
Router: Dashboard
Endpoints para estadísticas y KPIs del dashboard
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Annotated
import logging

from app.core.dependencies import get_current_user
from app.services.supabase_service import SupabaseService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/dashboard/stats")
async def get_stats(
    user_id: Annotated[str, Depends(get_current_user)],
):
    """Obtiene estadísticas agregadas para el dashboard"""
    cliente = await SupabaseService.get_cliente_by_user_id(user_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    stats = await SupabaseService.get_dashboard_stats(cliente["id"])
    return {"status": "success", "data": stats}


@router.get("/plantillas")
async def list_plantillas(
    user_id: Annotated[str, Depends(get_current_user)],
):
    """Lista las plantillas activas disponibles para despliegue"""
    plantillas = await SupabaseService.get_plantillas_activas()
    return {"status": "success", "data": plantillas}


@router.get("/profile")
async def get_profile(
    user_id: Annotated[str, Depends(get_current_user)],
):
    """Obtiene el perfil del cliente autenticado"""
    cliente = await SupabaseService.get_cliente_by_user_id(user_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    return {"status": "success", "data": cliente}
