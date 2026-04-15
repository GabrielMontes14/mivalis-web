"""
Router: Health Check
Endpoint para verificar el estado del servicio
"""
from fastapi import APIRouter
from datetime import datetime

from app.services.supabase_service import SupabaseService

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Endpoint de salud para verificar el servicio
    
    Returns:
        dict: Estado del servicio y timestamp actual
    """
    return {
        "status": "healthy",
        "service": "codavity-api",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }


@router.get("/test/supabase")
async def test_supabase():
    """
    Endpoint de prueba para verificar la conexión con Supabase
    
    Returns:
        dict: Resultado del test de conexión
    """
    success = await SupabaseService.test_connection()
    
    if success:
        return {
            "status": "success",
            "message": "Conexión con Supabase exitosa",
            "timestamp": datetime.utcnow().isoformat(),
        }
    else:
        return {
            "status": "error",
            "message": "Error al conectar con Supabase",
            "timestamp": datetime.utcnow().isoformat(),
        }
