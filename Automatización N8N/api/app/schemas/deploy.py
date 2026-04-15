"""
Schemas Pydantic - Deploy
Modelos de validación para endpoints de despliegue
"""
from pydantic import BaseModel, Field
from typing import Dict, Any
from datetime import datetime


class DeployRequest(BaseModel):
    """Request para desplegar un nuevo agente"""
    
    plantilla_ref: str = Field(
        ...,
        description="Referencia a la plantilla maestra (ej: 'sales_v1')",
        examples=["sales_v1"],
    )
    config_personalizada: Dict[str, Any] = Field(
        ...,
        description="Configuración específica del cliente",
        examples=[
            {
                "empresa_nombre": "Ferretería El Martillo",
                "prompt_sistema": "Eres el asistente de ventas de Ferretería El Martillo...",
            }
        ],
    )


class DeployResponse(BaseModel):
    """Response exitoso del despliegue de un agente"""
    
    status: str = Field(default="success", description="Estado del despliegue")
    workflow_id: str = Field(..., description="ID del workflow en n8n")
    webhook_url: str = Field(..., description="URL del webhook del agente")
    agente_id: str = Field(..., description="UUID del agente en la base de datos")
    activated_at: datetime = Field(..., description="Timestamp de activación")
    
    model_config = {"json_schema_extra": {
        "example": {
            "status": "success",
            "workflow_id": "n8n_12345",
            "webhook_url": "https://hooks.codavity.com/webhook/abc123",
            "agente_id": "550e8400-e29b-41d4-a716-446655440000",
            "activated_at": "2026-02-13T09:00:00Z",
        }
    }}
