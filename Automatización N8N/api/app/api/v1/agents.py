"""
Router: Agents
Endpoints para gestión de agentes desplegados
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated, List
import logging

from app.core.dependencies import get_current_user
from app.services.supabase_service import SupabaseService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/agents")
async def list_agents(
    user_id: Annotated[str, Depends(get_current_user)],
):
    """Lista todos los agentes del cliente autenticado"""
    cliente = await SupabaseService.get_cliente_by_user_id(user_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    agentes = await SupabaseService.get_agentes_by_cliente(cliente["id"])
    return {"status": "success", "data": agentes}


@router.get("/agents/{agente_id}")
async def get_agent(
    agente_id: str,
    user_id: Annotated[str, Depends(get_current_user)],
):
    """Obtiene detalle de un agente específico"""
    cliente = await SupabaseService.get_cliente_by_user_id(user_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    agente = await SupabaseService.get_agente_by_id(agente_id, cliente["id"])
    if not agente:
        raise HTTPException(status_code=404, detail="Agente no encontrado")

    return {"status": "success", "data": agente}


@router.patch("/agents/{agente_id}")
async def update_agent_status(
    agente_id: str,
    user_id: Annotated[str, Depends(get_current_user)],
    estado: str = "pausado",
):
    """Actualiza el estado de un agente (activo/pausado)"""
    if estado not in ("activo", "pausado"):
        raise HTTPException(status_code=400, detail="Estado inválido. Use 'activo' o 'pausado'")

    cliente = await SupabaseService.get_cliente_by_user_id(user_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    result = await SupabaseService.update_agente_estado(agente_id, cliente["id"], estado)
    if not result:
        raise HTTPException(status_code=404, detail="Agente no encontrado")

    return {"status": "success", "message": f"Agente {estado}", "data": result}


@router.delete("/agents/{agente_id}")
async def delete_agent(
    agente_id: str,
    user_id: Annotated[str, Depends(get_current_user)],
):
    """Elimina un agente (base de datos y n8n)"""
    cliente = await SupabaseService.get_cliente_by_user_id(user_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    agente = await SupabaseService.get_agente_by_id(agente_id, cliente["id"])
    if not agente:
        raise HTTPException(status_code=404, detail="Agente no encontrado")

    n8n_workflow_id = agente.get("n8n_workflow_id")

    success = await SupabaseService.delete_agente(agente_id, cliente["id"])
    if not success:
        raise HTTPException(status_code=500, detail="Error al eliminar agente en base de datos")

    if n8n_workflow_id:
        from app.services.n8n_service import N8nService
        try:
            await N8nService.eliminar_workflow(n8n_workflow_id)
        except Exception as e:
            logger.warning(f"Agente DB eliminado pero fallo borrado en n8n: {e}")

    return {"status": "success", "message": "Agente eliminado"}
