"""
Router: Leads
Endpoints para gestión de leads y conversaciones
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Annotated
import logging

from app.core.dependencies import get_current_user
from app.services.supabase_service import SupabaseService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/leads")
async def list_leads(
    user_id: Annotated[str, Depends(get_current_user)],
):
    """Lista todos los leads del cliente autenticado"""
    cliente = await SupabaseService.get_cliente_by_user_id(user_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    leads = await SupabaseService.get_leads_by_cliente(cliente["id"])
    return {"status": "success", "data": leads}


@router.get("/leads/{lead_id}/conversations")
async def get_conversations(
    lead_id: str,
    user_id: Annotated[str, Depends(get_current_user)],
):
    """Obtiene el historial de conversación de un lead"""
    cliente = await SupabaseService.get_cliente_by_user_id(user_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    conversations = await SupabaseService.get_conversations_by_lead(lead_id, cliente["id"])
    return {"status": "success", "data": conversations}
