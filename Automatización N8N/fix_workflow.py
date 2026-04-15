import asyncio
import json
import httpx
import time
from pathlib import Path
from app.core.config import settings
from app.services.supabase_service import SupabaseService
from app.services.n8n_service import N8nService
from app.services.deploy_service import DeployService

async def rebuild():
    headers = {"X-N8N-API-KEY": settings.N8N_API_KEY, "Content-Type": "application/json"}
    auth_creds = (settings.N8N_BASIC_AUTH_USER, settings.N8N_BASIC_AUTH_PASSWORD) if settings.N8N_BASIC_AUTH_USER else None
    
    # Step 0: Check available Gemini credentials in n8n
    async with httpx.AsyncClient(timeout=30.0, auth=auth_creds) as http:
        r = await http.get(f"{settings.N8N_API_URL}/credentials", headers=headers)
        creds = r.json().get("data", [])
        print("=== CREDENTIALS IN N8N ===")
        for c in creds:
            print(f"  [{c['id']}] {c['name']} type={c['type']}")
    
    # Step 1: Get active agent info
    client = SupabaseService.get_client()
    res = client.table('agentes_desplegados').select('*').eq('estado', 'activo').limit(1).execute()
    agente = res.data[0]
    old_workflow_id = agente['n8n_workflow_id']
    
    # Get client and template
    cliente_res = client.table('clientes').select('*').eq('id', agente['cliente_id']).execute()
    cliente = cliente_res.data[0]
    plantilla_res = client.table('plantillas').select('*').eq('id', agente['plantilla_id']).execute()
    plantilla = plantilla_res.data[0]
    
    # Step 2: Read fresh template
    template_path = Path(settings.TEMPLATES_DIR) / plantilla["archivo_json"]
    with open(template_path, "r", encoding="utf-8") as f:
        workflow_template = json.load(f)
    
    # Step 3: Inject variables
    config = agente['config_inyectada']
    workflow_data = DeployService._inject_variables(
        workflow_template, config, cliente, agente['id']
    )
    
    print(f"\nWorkflow nodes: {len(workflow_data['nodes'])}")
    for n in workflow_data['nodes']:
        cred = n.get('credentials', {})
        onerr = n.get('onError', '')
        print(f"  - {n['name']} cred={cred} onError={onerr}")
    
    # Step 4: Delete old
    print(f"\n1. Deleting {old_workflow_id}...")
    try:
        await N8nService.eliminar_workflow(old_workflow_id)
        print("   DELETED")
    except Exception as e:
        print(f"   {e}")
    
    # Step 5: Create new
    print("2. Creating...")
    new_wf = await N8nService.crear_workflow(workflow_data)
    new_id = new_wf["id"]
    print(f"   {new_id}")
    
    # Step 6: Activate
    print("3. Activating...")
    try:
        await N8nService.activar_workflow(new_id)
        print("   OK")
    except Exception as e:
        print(f"   {e}")
    
    # Step 7: Update DB
    webhook_url = N8nService.extraer_webhook_url(new_wf)
    client.table('agentes_desplegados').update({
        'n8n_workflow_id': new_id,
        'webhook_url': webhook_url
    }).eq('id', agente['id']).execute()
    print(f"4. DB updated. Webhook: {webhook_url}")
    
    # Step 8: Wait
    print("5. Waiting 3s...")
    time.sleep(3)
    
    # Step 9: TEST
    print(f"\n6. TESTING...")
    payload = {"telefono": "573001119999", "mensaje": "Hola", "nombre": "Gabriel"}
    start = time.time()
    async with httpx.AsyncClient(timeout=120.0) as http:
        resp = await http.post(webhook_url, json=payload)
        elapsed = time.time() - start
        print(f"   Status: {resp.status_code} ({elapsed:.1f}s)")
        print(f"   Body: {resp.text[:500]}")

asyncio.run(rebuild())
