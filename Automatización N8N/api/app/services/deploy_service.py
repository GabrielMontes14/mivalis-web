"""
Servicio de Deploy - Orquestación del despliegue de agentes
"""
import json
import os
import uuid
from pathlib import Path
from typing import Dict, Any
import logging

from app.core.config import settings
from app.services.supabase_service import SupabaseService
from app.services.n8n_service import N8nService

logger = logging.getLogger(__name__)


class DeployService:
    """Servicio para orquestar el despliegue de agentes"""
    
    @classmethod
    async def deploy_agent(
        cls,
        user_id: str,
        plantilla_ref: str,
        config_personalizada: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Despliega un nuevo agente para un cliente
        
        Flujo:
        1. Obtener cliente por user_id
        2. Verificar créditos (mínimo -10)
        3. Obtener plantilla por ref_nombre
        4. Leer JSON de plantilla desde /templates
        5. Inyectar variables dinámicas en el JSON
        6. Crear workflow en n8n
        7. Activar workflow
        8. Descontar créditos
        9. Guardar agente_desplegado en BD
        10. Retornar webhook_url y workflow_id
        
        Args:
            user_id: UUID del usuario de Supabase Auth
            plantilla_ref: Referencia de la plantilla (ej: 'sales_v1')
            config_personalizada: Configuración del cliente
        
        Returns:
            Dict con workflow_id, webhook_url, agente_id, activated_at
        
        Raises:
            ValueError: Si el cliente no existe, no tiene créditos, o la plantilla no existe
            HTTPError: Si falla la comunicación con n8n después de 3 reintentos
        """
        logger.info("Iniciando despliegue de agente", extra={
            "user_id": user_id,
            "plantilla_ref": plantilla_ref
        })
        
        # 0. Generar ID del agente anticipadamente
        new_agent_id = str(uuid.uuid4())

        # 1. Obtener cliente específico (seleccionado en wizard)
        cliente_id = config_personalizada.pop("cliente_id", None)
        if cliente_id:
            # Verificar que el cliente existe y pertenece al usuario autenticado
            cliente = await SupabaseService.get_cliente_by_id_and_owner(cliente_id, user_id)
        else:
            # Fallback: buscar primer cliente del usuario
            cliente = await SupabaseService.get_cliente_by_user_id(user_id)
        
        if not cliente:
            raise ValueError(f"Cliente no encontrado o no pertenece al usuario")
        
        cliente_id = cliente["id"]
        
        # 2. Verificar créditos
        creditos_info = await SupabaseService.verificar_creditos(cliente_id)
        if creditos_info["creditos_mensuales"] <= -10:
            raise ValueError("Créditos insuficientes. El cliente ha alcanzado el límite de sobregiro.")
        
        # 3. Obtener plantilla
        plantilla = await SupabaseService.get_plantilla_by_ref(plantilla_ref)
        if not plantilla:
            raise ValueError(f"Plantilla no encontrada: {plantilla_ref}")
        
        # 4. Leer JSON de plantilla
        template_path = Path(settings.TEMPLATES_DIR) / plantilla["archivo_json"]
        if not template_path.exists():
            raise ValueError(f"Archivo de plantilla no encontrado: {plantilla['archivo_json']}")
        
        with open(template_path, "r", encoding="utf-8") as f:
            workflow_template = json.load(f)
        
        logger.info("Plantilla cargada", extra={
            "plantilla_id": plantilla["id"],
            "archivo": plantilla["archivo_json"]
        })
        
        # 5. Inyectar variables dinámicas
        workflow_data = cls._inject_variables(
            workflow_template,
            config_personalizada,
            cliente,
            new_agent_id
        )
        
        # 6. Crear workflow en n8n (con retry automático)
        try:
            workflow = await N8nService.crear_workflow(workflow_data)
            workflow_id = workflow["id"]
            
            logger.info("Workflow creado en n8n", extra={"workflow_id": workflow_id})
        except Exception as e:
            logger.error("Error al crear workflow", extra={"error": str(e)}, exc_info=True)
            raise ValueError(f"Error al crear workflow en n8n: {str(e)}")
        
        # 7. Activar workflow
        try:
            await N8nService.activar_workflow(workflow_id)
        except Exception as e:
            # No fallar el deploy si solo es un error de activación (común si faltan credenciales)
            logger.warning("No se pudo activar el workflow automáticamente (posiblemente faltan credenciales)", 
                           extra={"workflow_id": workflow_id, "error": str(e)})
            # Continuamos el proceso, el usuario deberá activarlo manualmente
        
        # 7.5 Re-registrar webhook (n8n no registra webhooks de workflows creados vía API)
        try:
            await N8nService.reregistrar_webhook(workflow_id)
        except Exception as e:
            logger.warning("No se pudo re-registrar webhook automáticamente",
                          extra={"workflow_id": workflow_id, "error": str(e)})
        
        # 8. Extraer webhook URL
        webhook_url = N8nService.extraer_webhook_url(workflow)
        if not webhook_url:
            logger.warning("No se pudo extraer webhook URL del workflow", extra={"workflow_id": workflow_id})
            webhook_url = f"https://hooks.{settings.DOMAIN}/webhook/{workflow_id}"  # Fallback
        
        # 9. Descontar créditos (costo de despliegue: 10 créditos)
        try:
            await SupabaseService.descontar_creditos(cliente_id, cantidad=10)
        except Exception as e:
            logger.error("Error al descontar créditos", extra={"cliente_id": cliente_id, "error": str(e)}, exc_info=True)
            # No hacemos rollback del workflow, solo logueamos el error
            # El admin puede corregir manualmente
        
        # 10. Guardar agente_desplegado en BD
        try:
            agente = await SupabaseService.crear_agente_desplegado(
                cliente_id=cliente_id,
                plantilla_id=plantilla["id"],
                n8n_workflow_id=workflow_id,
                webhook_url=webhook_url,
                config_inyectada=config_personalizada,
                system_prompt=config_personalizada.get("prompt_sistema", ""),
                id=new_agent_id
            )
            
            logger.info("Agente desplegado exitosamente", extra={
                "agente_id": agente["id"],
                "workflow_id": workflow_id,
                "cliente_id": cliente_id
            })
            
            return {
                "status": "success",
                "workflow_id": workflow_id,
                "webhook_url": webhook_url,
                "agente_id": agente["id"],
                "activated_at": agente["creado_en"]
            }
        
        except Exception as e:
            logger.error("Error al guardar agente en BD", extra={"error": str(e)}, exc_info=True)
            raise ValueError(f"Error al guardar agente en base de datos: {str(e)}")
    
    @classmethod
    def _build_default_prompt(cls, config: Dict[str, Any], cliente: Dict[str, Any]) -> str:
        """Genera un prompt de sistema profesional basado en la configuración del cliente"""
        empresa = config.get("empresa_nombre", cliente.get("nombre_empresa", "la empresa"))
        bot_name = config.get("nombre_bot", "Asistente de IA")
        descripcion = config.get("descripcion_negocio", "")
        productos = config.get("lista_productos", "")
        objetivo = config.get("objetivo_conversion", "Agendar una cita")
        link_agenda = config.get("link_agenda", "")
        link_pago = config.get("link_pago", "")

        prompt = f"""Eres {bot_name}, el asistente virtual de {empresa}."""

        if descripcion:
            prompt += f"\n\nSobre la empresa:\n{descripcion}"

        if productos:
            prompt += f"\n\nProductos y servicios disponibles:\n{productos}"

        prompt += f"""

Tu objetivo principal es: {objetivo}.

REGLAS DE COMPORTAMIENTO:
1. Se amable, profesional y conciso en tus respuestas.
2. Responde SIEMPRE en el idioma del cliente (si escribe en español, responde en español).
3. Presenta los productos/servicios de forma atractiva cuando sea relevante.
4. Guia la conversacion hacia el objetivo: {objetivo}.
5. Si el cliente muestra interes, facilita el siguiente paso."""

        if link_agenda:
            prompt += f"\n6. Para agendar citas, comparte este enlace: {link_agenda}"
        if link_pago:
            prompt += f"\n7. Para pagos, comparte este enlace: {link_pago}"

        prompt += """
8. Si no sabes la respuesta a algo, di que consultaras con el equipo y responderan pronto.
9. Nunca inventes informacion sobre precios o disponibilidad que no tengas.
10. Manten un tono conversacional pero profesional."""

        return prompt

    @classmethod
    def _json_escape(cls, value: str) -> str:
        """Escapa un valor para ser seguro dentro de un string JSON"""
        # json.dumps adds quotes, so we strip them to get just the escaped content
        return json.dumps(str(value))[1:-1]

    @classmethod
    def _inject_variables(
        cls,
        workflow_template: Dict[str, Any],
        config_personalizada: Dict[str, Any],
        cliente: Dict[str, Any],
        agent_id: str
    ) -> Dict[str, Any]:
        """
        Inyecta variables dinámicas en el workflow template.
        Todos los valores son JSON-escaped para evitar romper el JSON.
        """
        # Clonar el template
        workflow = json.loads(json.dumps(workflow_template))
        
        # Generar prompt personalizado si no se proporcionó uno
        prompt_sistema = config_personalizada.get("prompt_sistema", "")
        if not prompt_sistema.strip():
            prompt_sistema = cls._build_default_prompt(config_personalizada, cliente)
        
        empresa_nombre = config_personalizada.get("empresa_nombre", cliente.get("nombre_empresa", "Agente"))
        
        # Convertir workflow a string para reemplazar placeholders
        workflow_str = json.dumps(workflow)
        
        
        supabase_url = os.environ.get("SUPABASE_URL", "")
        supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")

        # Mapeo de placeholders (valores son JSON-escaped para seguridad)
        replacements = {
            "{{EMPRESA_NOMBRE}}": cls._json_escape(empresa_nombre),
            "{{NOMBRE_BOT}}": cls._json_escape(config_personalizada.get("nombre_bot", "Asistente de IA")),
            "{{DESCRIPCION_NEGOCIO}}": cls._json_escape(config_personalizada.get("descripcion_negocio", "")),
            "{{LISTA_PRODUCTOS}}": cls._json_escape(config_personalizada.get("lista_productos", "")),
            "{{OBJETIVO_CONVERSION}}": cls._json_escape(config_personalizada.get("objetivo_conversion", "Agendar una cita")),
            "{{LINK_AGENDA}}": cls._json_escape(config_personalizada.get("link_agenda", "")),
            "{{LINK_PAGO}}": cls._json_escape(config_personalizada.get("link_pago", "")),
            "{{CLIENTE_ID}}": cls._json_escape(cliente["id"]),
            "{{PROMPT_SISTEMA}}": cls._json_escape(prompt_sistema),
            "{{AGENTE_ID}}": cls._json_escape(agent_id),
            "{{SUPABASE_URL}}": cls._json_escape(supabase_url),
            "{{SUPABASE_KEY}}": cls._json_escape(supabase_key),
        }
        
        # Reemplazar todos los placeholders
        for placeholder, value in replacements.items():
            workflow_str = workflow_str.replace(placeholder, value)
            
        workflow = json.loads(workflow_str)
        
        # Sobrescribir nombre del workflow (ya fuera de JSON string replacement)
        workflow["name"] = f"{empresa_nombre} - Agente de Ventas"
        
        # Asignar IDs unicos a cada nodo para asegurar registro de webhooks en n8n
        for node in workflow.get("nodes", []):
            if "id" not in node:
                node["id"] = str(uuid.uuid4())
            if node.get("type") == "n8n-nodes-base.webhook" and "webhookId" not in node:
                node["webhookId"] = str(uuid.uuid4())
        
        logger.info("Variables inyectadas en workflow", extra={
            "empresa_nombre": empresa_nombre,
            "prompt_len": len(prompt_sistema),
            "placeholders_reemplazados": len([v for v in replacements.values() if v])
        })
        
        return workflow
