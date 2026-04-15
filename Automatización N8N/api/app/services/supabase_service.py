"""
Cliente de Supabase - Servicio para interactuar con la base de datos
"""
from supabase import create_client, Client
from typing import Optional, Dict, Any, List
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class SupabaseService:
    """Servicio para interactuar con Supabase"""
    
    _client: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Client:
        """
        Obtiene la instancia del cliente de Supabase (Singleton)
        
        Returns:
            Client: Cliente de Supabase con Service Role Key (bypass RLS)
        """
        if cls._client is None:
            cls._client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY
            )
            logger.info("Cliente de Supabase inicializado", extra={
                "supabase_url": settings.SUPABASE_URL
            })
        return cls._client
    
    @classmethod
    async def get_cliente_by_user_id(cls, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtiene los datos de un cliente por su supabase_user_id
        
        Args:
            user_id: UUID del usuario de Supabase Auth
        
        Returns:
            Dict con los datos del cliente o None si no existe
        """
        client = cls.get_client()
        
        response = client.table("clientes").select("*").eq("owner_user_id", user_id).execute()
        
        if response.data and len(response.data) > 0:
            logger.info("Cliente encontrado", extra={"user_id": user_id, "cliente_id": response.data[0]["id"]})
            return response.data[0]
        
        logger.warning("Cliente no encontrado", extra={"user_id": user_id})
        return None
    
    @classmethod
    async def get_cliente_by_id_and_owner(cls, cliente_id: str, owner_user_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtiene un cliente por su ID verificando que pertenece al usuario

        Args:
            cliente_id: UUID del cliente
            owner_user_id: UUID del usuario autenticado (dueño)

        Returns:
            Dict con los datos del cliente o None si no existe o no pertenece al usuario
        """
        client = cls.get_client()

        response = (
            client.table("clientes")
            .select("*")
            .eq("id", cliente_id)
            .eq("owner_user_id", owner_user_id)
            .execute()
        )

        if response.data and len(response.data) > 0:
            logger.info("Cliente encontrado y verificado", extra={"cliente_id": cliente_id})
            return response.data[0]

        logger.warning("Cliente no encontrado o no pertenece al usuario", extra={
            "cliente_id": cliente_id, "owner_user_id": owner_user_id
        })
        return None
    
    @classmethod
    async def get_plantilla_by_ref(cls, ref_nombre: str) -> Optional[Dict[str, Any]]:
        """
        Obtiene una plantilla por su nombre de referencia
        
        Args:
            ref_nombre: Nombre de referencia de la plantilla (ej: 'sales_v1')
        
        Returns:
            Dict con los datos de la plantilla o None si no existe
        """
        client = cls.get_client()
        
        response = client.table("plantillas").select("*").eq("ref_nombre", ref_nombre).eq("activa", True).execute()
        
        if response.data and len(response.data) > 0:
            logger.info("Plantilla encontrada", extra={"ref_nombre": ref_nombre})
            return response.data[0]
        
        logger.warning("Plantilla no encontrada", extra={"ref_nombre": ref_nombre})
        return None
    
    @classmethod
    async def verificar_creditos(cls, cliente_id: str) -> Dict[str, Any]:
        """
        Verifica el saldo de créditos de un cliente.
        Si la tabla no tiene columnas de créditos, retorna defaults permisivos.
        """
        client = cls.get_client()
        
        try:
            response = client.table("clientes").select(
                "creditos_mensuales, creditos_plan_base, estado"
            ).eq("id", cliente_id).execute()
            
            if response.data and len(response.data) > 0:
                data = response.data[0]
                logger.info("Créditos verificados", extra={
                    "cliente_id": cliente_id,
                    "creditos_mensuales": data.get("creditos_mensuales", 100)
                })
                return data
        except Exception as e:
            logger.warning("Columnas de créditos no disponibles, usando defaults", extra={
                "cliente_id": cliente_id, "error": str(e)
            })
            return {"creditos_mensuales": 100, "creditos_plan_base": 100, "estado": "activo"}
        
        raise ValueError(f"Cliente {cliente_id} no encontrado")
    
    @classmethod
    async def descontar_creditos(cls, cliente_id: str, cantidad: int) -> bool:
        """
        Descuenta créditos del saldo mensual de un cliente.
        Falla graciosamente si las columnas de créditos no existen.
        """
        try:
            client = cls.get_client()
            
            creditos_info = await cls.verificar_creditos(cliente_id)
            nuevo_saldo = creditos_info.get("creditos_mensuales", 100) - cantidad
            
            if nuevo_saldo < -10:
                logger.warning("Límite de sobregiro excedido", extra={
                    "cliente_id": cliente_id, "nuevo_saldo": nuevo_saldo
                })
                raise ValueError("Límite de sobregiro excedido.")
            
            client.table("clientes").update({
                "creditos_mensuales": nuevo_saldo
            }).eq("id", cliente_id).execute()
            
            logger.info("Créditos descontados", extra={
                "cliente_id": cliente_id, "cantidad": cantidad, "nuevo_saldo": nuevo_saldo
            })
            return True
        except ValueError:
            raise
        except Exception as e:
            logger.warning("No se pudieron descontar créditos (columnas no disponibles)", extra={
                "cliente_id": cliente_id, "error": str(e)
            })
            return True  # No bloquear el deploy por créditos
    
    @classmethod
    async def crear_agente_desplegado(
        cls,
        cliente_id: str,
        plantilla_id: str,
        n8n_workflow_id: str,
        webhook_url: str,
        config_inyectada: Dict[str, Any],
        system_prompt: str,
        id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Crea un registro de agente desplegado en la BD
        
        Args:
            cliente_id: UUID del cliente
            plantilla_id: UUID de la plantilla usada
            n8n_workflow_id: ID del workflow en n8n
            webhook_url: URL del webhook del agente
            config_inyectada: Configuración personalizada inyectada
            system_prompt: Prompt del sistema
            id: UUID del agente (opcional)
        
        Returns:
            Dict con los datos del agente creado
        """
        client = cls.get_client()
        
        data = {
            "cliente_id": cliente_id,
            "plantilla_id": plantilla_id,
            "n8n_workflow_id": n8n_workflow_id,
            "webhook_url": webhook_url,
            "estado": "activo",
            "config_inyectada": config_inyectada,
            "system_prompt": system_prompt
        }
        
        if id:
            data["id"] = id
        
        response = client.table("agentes_desplegados").insert(data).execute()
        
        if response.data and len(response.data) > 0:
            agente = response.data[0]
            logger.info("Agente desplegado creado", extra={
                "agente_id": agente["id"],
                "cliente_id": cliente_id,
                "n8n_workflow_id": n8n_workflow_id
            })
            return agente
        
        raise ValueError("Error al crear agente desplegado en BD")
    
    @classmethod
    async def test_connection(cls) -> bool:
        """
        Prueba la conexión a Supabase consultando la tabla plantillas
        
        Returns:
            bool: True si la conexión es exitosa
        """
        try:
            client = cls.get_client()
            response = client.table("plantillas").select("count", count="exact").execute()
            logger.info("Test de conexión exitoso", extra={"count": response.count})
            return True
        except Exception as e:
            logger.error("Test de conexión fallido", extra={"error": str(e)}, exc_info=True)
            return False

    # ── Dashboard Methods ──────────────────────────────────────

    @classmethod
    async def get_agentes_by_cliente(cls, cliente_id: str) -> List[Dict[str, Any]]:
        """Obtiene todos los agentes desplegados de un cliente"""
        client = cls.get_client()
        response = (
            client.table("agentes_desplegados")
            .select("*, plantillas(ref_nombre, descripcion)")
            .eq("cliente_id", cliente_id)
            .neq("estado", "eliminado")
            .order("creado_en", desc=True)
            .execute()
        )
        return response.data or []

    @classmethod
    async def get_agente_by_id(cls, agente_id: str, cliente_id: str) -> Optional[Dict[str, Any]]:
        """Obtiene un agente específico verificando que pertenece al cliente"""
        client = cls.get_client()
        response = (
            client.table("agentes_desplegados")
            .select("*, plantillas(ref_nombre, descripcion)")
            .eq("id", agente_id)
            .eq("cliente_id", cliente_id)
            .execute()
        )
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None

    @classmethod
    async def update_agente_estado(cls, agente_id: str, cliente_id: str, nuevo_estado: str) -> Optional[Dict[str, Any]]:
        """Actualiza el estado de un agente (activo/pausado)"""
        client = cls.get_client()
        response = (
            client.table("agentes_desplegados")
            .update({"estado": nuevo_estado})
            .eq("id", agente_id)
            .eq("cliente_id", cliente_id)
            .execute()
        )
        if response.data and len(response.data) > 0:
            logger.info("Estado de agente actualizado", extra={
                "agente_id": agente_id, "nuevo_estado": nuevo_estado
            })
            return response.data[0]
        return None

    @classmethod
    async def delete_agente(cls, agente_id: str, cliente_id: str) -> bool:
        """Marca un agente como eliminado (soft delete)"""
        result = await cls.update_agente_estado(agente_id, cliente_id, "eliminado")
        return result is not None

    @classmethod
    async def get_leads_by_cliente(cls, cliente_id: str) -> List[Dict[str, Any]]:
        """Obtiene todos los leads de un cliente"""
        client = cls.get_client()
        response = (
            client.table("leads")
            .select("*, agentes_desplegados(config_inyectada)")
            .eq("cliente_id", cliente_id)
            .order("ultimo_contacto", desc=True)
            .execute()
        )
        return response.data or []

    @classmethod
    async def get_conversations_by_lead(cls, lead_id: str, cliente_id: str) -> List[Dict[str, Any]]:
        """Obtiene el historial de conversación de un lead"""
        client = cls.get_client()
        response = (
            client.table("logs_conversacion")
            .select("*")
            .eq("lead_id", lead_id)
            .eq("cliente_id", cliente_id)
            .order("creado_en", desc=False)
            .execute()
        )
        return response.data or []

    @classmethod
    async def get_dashboard_stats(cls, cliente_id: str) -> Dict[str, Any]:
        """Obtiene estadísticas agregadas para el dashboard"""
        client = cls.get_client()

        # Agentes activos
        agentes_resp = (
            client.table("agentes_desplegados")
            .select("id, estado", count="exact")
            .eq("cliente_id", cliente_id)
            .neq("estado", "eliminado")
            .execute()
        )
        agentes_activos = sum(1 for a in (agentes_resp.data or []) if a["estado"] == "activo")
        agentes_total = len(agentes_resp.data or [])

        # Leads totales
        leads_resp = (
            client.table("leads")
            .select("id, estado, score_interes", count="exact")
            .eq("cliente_id", cliente_id)
            .execute()
        )
        leads_total = len(leads_resp.data or [])
        leads_calificados = sum(1 for l in (leads_resp.data or []) if l["estado"] == "calificado")
        leads_convertidos = sum(1 for l in (leads_resp.data or []) if l["estado"] == "convertido")

        # Créditos
        creditos = await cls.verificar_creditos(cliente_id)

        # Conversaciones recientes
        logs_resp = (
            client.table("logs_conversacion")
            .select("id", count="exact")
            .eq("cliente_id", cliente_id)
            .execute()
        )
        mensajes_total = len(logs_resp.data or [])

        return {
            "agentes_activos": agentes_activos,
            "agentes_total": agentes_total,
            "leads_total": leads_total,
            "leads_calificados": leads_calificados,
            "leads_convertidos": leads_convertidos,
            "creditos_mensuales": creditos.get("creditos_mensuales", 0),
            "creditos_plan_base": creditos.get("creditos_plan_base", 0),
            "mensajes_total": mensajes_total,
        }

    @classmethod
    async def get_plantillas_activas(cls) -> List[Dict[str, Any]]:
        """Obtiene todas las plantillas activas disponibles para despliegue"""
        client = cls.get_client()
        response = (
            client.table("plantillas")
            .select("*")
            .eq("activa", True)
            .order("ref_nombre")
            .execute()
        )
        return response.data or []

    @classmethod
    async def delete_agente(cls, agente_id: str, cliente_id: str) -> bool:
        """Elimina un agente de la base de datos"""
        client = cls.get_client()
        try:
            response = (
                client.table("agentes_desplegados")
                .delete()
                .eq("id", agente_id)
                .eq("cliente_id", cliente_id)
                .execute()
            )
            return len(response.data or []) > 0
        except Exception as e:
            logger.error(f"Error eliminando agente en Supabase: {e}")
            return False
