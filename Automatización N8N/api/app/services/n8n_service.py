"""
Cliente de n8n API - Servicio para interactuar con n8n
"""
import httpx
from typing import Dict, Any, Optional
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings

logger = logging.getLogger(__name__)


class N8nService:
    """Servicio para interactuar con la API de n8n"""
    
    @classmethod
    def _get_headers(cls) -> Dict[str, str]:
        """Obtiene los headers necesarios para autenticarse con n8n"""
        return {
            "X-N8N-API-KEY": settings.N8N_API_KEY,
            "Content-Type": "application/json"
        }
    
    @classmethod
    @retry(
        stop=stop_after_attempt(settings.DEPLOY_MAX_RETRIES),
        wait=wait_exponential(multiplier=settings.DEPLOY_BACKOFF_BASE, min=1, max=10),
        retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
        reraise=True
    )
    async def crear_workflow(cls, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crea un nuevo workflow en n8n
        
        Args:
            workflow_data: Datos del workflow en formato JSON de n8n
        
        Returns:
            Dict con los datos del workflow creado (incluye 'id')
        
        Raises:
            httpx.HTTPError: Si falla la petición después de 3 reintentos
        """
        url = f"{settings.N8N_API_URL}/workflows"
        
        auth_creds = (settings.N8N_BASIC_AUTH_USER, settings.N8N_BASIC_AUTH_PASSWORD) if settings.N8N_BASIC_AUTH_USER else None
        async with httpx.AsyncClient(timeout=30.0, auth=auth_creds) as client:
            logger.info("Creando workflow en n8n", extra={"url": url})
            
            response = await client.post(
                url,
                json=workflow_data,
                headers=cls._get_headers()
            )
            response.raise_for_status()
            
            workflow = response.json()
            logger.info("Workflow creado exitosamente", extra={
                "workflow_id": workflow.get("id"),
                "workflow_name": workflow.get("name")
            })
            
            return workflow
    
    @classmethod
    @retry(
        stop=stop_after_attempt(settings.DEPLOY_MAX_RETRIES),
        wait=wait_exponential(multiplier=settings.DEPLOY_BACKOFF_BASE, min=1, max=10),
        retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
        reraise=True
    )
    async def activar_workflow(cls, workflow_id: str) -> bool:
        """
        Activa un workflow en n8n
        
        Args:
            workflow_id: ID del workflow a activar
        
        Returns:
            bool: True si se activó correctamente
        
        Raises:
            httpx.HTTPError: Si falla la petición después de 3 reintentos
        """
        url = f"{settings.N8N_API_URL}/workflows/{workflow_id}/activate"
        
        auth_creds = (settings.N8N_BASIC_AUTH_USER, settings.N8N_BASIC_AUTH_PASSWORD) if settings.N8N_BASIC_AUTH_USER else None
        async with httpx.AsyncClient(timeout=30.0, auth=auth_creds) as client:
            logger.info("Activando workflow", extra={"workflow_id": workflow_id})
            
            response = await client.post(
                url,
                headers=cls._get_headers()
            )
            response.raise_for_status()
            
            logger.info("Workflow activado exitosamente", extra={"workflow_id": workflow_id})
            return True
    
    @classmethod
    async def desactivar_workflow(cls, workflow_id: str) -> bool:
        """
        Desactiva un workflow en n8n
        
        Args:
            workflow_id: ID del workflow a desactivar
        
        Returns:
            bool: True si se desactivó correctamente
        """
        url = f"{settings.N8N_API_URL}/workflows/{workflow_id}/deactivate"
        
        auth_creds = (settings.N8N_BASIC_AUTH_USER, settings.N8N_BASIC_AUTH_PASSWORD) if settings.N8N_BASIC_AUTH_USER else None
        async with httpx.AsyncClient(timeout=30.0, auth=auth_creds) as client:
            logger.info("Desactivando workflow", extra={"workflow_id": workflow_id})
            
            response = await client.post(
                url,
                headers=cls._get_headers()
            )
            response.raise_for_status()
            
            logger.info("Workflow desactivado exitosamente", extra={"workflow_id": workflow_id})
            return True
    
    @classmethod
    async def reregistrar_webhook(cls, workflow_id: str) -> bool:
        """
        Fuerza el re-registro del webhook de un workflow.
        
        N8n no registra automáticamente webhooks para workflows creados vía API.
        Este método desactiva y reactiva el workflow para forzar el registro.
        
        Args:
            workflow_id: ID del workflow
        
        Returns:
            bool: True si se re-registró correctamente
        """
        import asyncio
        
        logger.info("Re-registrando webhook via deactivate/activate", extra={"workflow_id": workflow_id})
        
        try:
            await cls.desactivar_workflow(workflow_id)
            await asyncio.sleep(1)  # Breve pausa para que n8n libere el webhook
            await cls.activar_workflow(workflow_id)
            logger.info("Webhook re-registrado exitosamente", extra={"workflow_id": workflow_id})
            return True
        except Exception as e:
            logger.warning("Error al re-registrar webhook, el workflow puede necesitar restart manual de n8n",
                         extra={"workflow_id": workflow_id, "error": str(e)})
            return False
    
    @classmethod
    async def obtener_workflow(cls, workflow_id: str) -> Dict[str, Any]:
        """
        Obtiene los datos de un workflow
        
        Args:
            workflow_id: ID del workflow
        
        Returns:
            Dict con los datos del workflow
        """
        url = f"{settings.N8N_API_URL}/workflows/{workflow_id}"
        
        auth_creds = (settings.N8N_BASIC_AUTH_USER, settings.N8N_BASIC_AUTH_PASSWORD) if settings.N8N_BASIC_AUTH_USER else None
        async with httpx.AsyncClient(timeout=30.0, auth=auth_creds) as client:
            response = await client.get(
                url,
                headers=cls._get_headers()
            )
            response.raise_for_status()
            
            return response.json()
    
    @classmethod
    async def actualizar_workflow(cls, workflow_id: str, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Actualiza un workflow existente (ej: cambiar system prompt)
        
        Args:
            workflow_id: ID del workflow a actualizar
            workflow_data: Datos actualizados del workflow
        
        Returns:
            Dict con los datos del workflow actualizado
        """
        url = f"{settings.N8N_API_URL}/workflows/{workflow_id}"
        
        auth_creds = (settings.N8N_BASIC_AUTH_USER, settings.N8N_BASIC_AUTH_PASSWORD) if settings.N8N_BASIC_AUTH_USER else None
        async with httpx.AsyncClient(timeout=30.0, auth=auth_creds) as client:
            logger.info("Actualizando workflow", extra={"workflow_id": workflow_id})
            
            response = await client.put(
                url,
                json=workflow_data,
                headers=cls._get_headers()
            )
            response.raise_for_status()
            
            workflow = response.json()
            logger.info("Workflow actualizado exitosamente", extra={"workflow_id": workflow_id})
            
            return workflow
    
    @classmethod
    async def eliminar_workflow(cls, workflow_id: str) -> bool:
        """
        Elimina un workflow (soft delete - solo marcarlo como inactivo)
        
        Args:
            workflow_id: ID del workflow
        
        Returns:
            bool: True si se eliminó correctamente
        """
        url = f"{settings.N8N_API_URL}/workflows/{workflow_id}"
        
        auth_creds = (settings.N8N_BASIC_AUTH_USER, settings.N8N_BASIC_AUTH_PASSWORD) if settings.N8N_BASIC_AUTH_USER else None
        async with httpx.AsyncClient(timeout=30.0, auth=auth_creds) as client:
            logger.info("Eliminando workflow", extra={"workflow_id": workflow_id})
            
            response = await client.delete(
                url,
                headers=cls._get_headers()
            )
            response.raise_for_status()
            
            logger.info("Workflow eliminado", extra={"workflow_id": workflow_id})
            return True
    
    @classmethod
    def extraer_webhook_url(cls, workflow: Dict[str, Any]) -> Optional[str]:
        """
        Extrae la URL del webhook de un workflow de n8n
        
        Args:
            workflow: Datos completos del workflow
        
        Returns:
            str: URL del webhook o None si no se encuentra
        """
        # Buscar el nodo de tipo "webhook" en los nodes del workflow
        nodes = workflow.get("nodes", [])
        
        for node in nodes:
            if node.get("type") == "n8n-nodes-base.webhook":
                # La URL del webhook se construye a partir del path configurado
                webhook_path = node.get("parameters", {}).get("path", "")
                if webhook_path:
                    # Construir URL completa (asumiendo configuración de n8n)
                    base_url = settings.N8N_API_URL.replace("/api/v1", "")
                    webhook_url = f"{base_url}/webhook/{webhook_path}"
                    logger.info("Webhook URL extraída", extra={"webhook_url": webhook_url})
                    return webhook_url
        
        logger.warning("No se encontró webhook en el workflow", extra={"workflow_id": workflow.get("id")})
        return None
