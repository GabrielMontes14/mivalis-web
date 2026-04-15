import asyncio
import json
from pathlib import Path
from app.core.config import settings
from app.services.supabase_service import SupabaseService
from app.services.n8n_service import N8nService
from app.services.deploy_service import DeployService

async def redeploy():
    client = SupabaseService.get_client()
    res = client.table('agentes_desplegados').select('*').eq('estado', 'activo').limit(1).execute()
    if not res.data:
        print("NO ACTIVE AGENTS FOUND")
        return
        
    agente = res.data[0]
    cliente_id = agente['cliente_id']
    config = agente['config_inyectada']
    
    print(f"REDEPLOYING AGENT: {config['nombre_bot']}")
    
    # Fetch client directly
    cliente_res = client.table('clientes').select('*').eq('id', cliente_id).execute()
    cliente = cliente_res.data[0]
    
    # Fetch plantilla directly
    plantilla_res = client.table('plantillas').select('*').eq('id', agente['plantilla_id']).execute()
    plantilla = plantilla_res.data[0]
    
    template_path = Path(settings.TEMPLATES_DIR) / plantilla["archivo_json"]
    with open(template_path, "r", encoding="utf-8") as f:
        workflow_template = json.load(f)
        
    workflow_data = DeployService._inject_variables(
        workflow_template,
        config,
        cliente,
        agente['id']
    )
    
    workflow_id = agente['n8n_workflow_id']
    await N8nService.actualizar_workflow(workflow_id, workflow_data)
    
    print(f"SUCCESS: Workflow {workflow_id} Updated to V2 (Sync Response)")

if __name__ == '__main__':
    asyncio.run(redeploy())
