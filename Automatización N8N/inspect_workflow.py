import asyncio
import json
from app.services.n8n_service import N8nService
from app.services.supabase_service import SupabaseService

async def inspect():
    client = SupabaseService.get_client()
    res = client.table('agentes_desplegados').select('*').eq('estado', 'activo').limit(1).execute()
    agente = res.data[0]
    workflow_id = agente['n8n_workflow_id']
    
    print(f"=== INSPECTING WORKFLOW: {workflow_id} ===")
    
    workflow = await N8nService.obtener_workflow(workflow_id)
    
    # Print nodes
    print("\n--- NODES ---")
    for node in workflow.get('nodes', []):
        print(f"  [{node['type']}] name='{node['name']}' params={json.dumps(node.get('parameters', {}), indent=2)[:300]}")
    
    # Print connections
    print("\n--- CONNECTIONS ---")
    for src, conns in workflow.get('connections', {}).items():
        for conn_type, targets in conns.items():
            for target_list in targets:
                for t in target_list:
                    print(f"  {src} --({conn_type})--> {t['node']}")
    
    # Print settings
    print(f"\n--- SETTINGS ---")
    print(json.dumps(workflow.get('settings', {}), indent=2))
    
    # Check active state
    print(f"\n--- ACTIVE: {workflow.get('active', 'unknown')} ---")

if __name__ == '__main__':
    asyncio.run(inspect())
