import os
import httpx
from supabase import create_client, Client

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

print("\n--- AUDITORIA DE SUPABASE (Tabla: agentes_desplegados) ---")
res = supabase.table("agentes_desplegados").select("*").order("creado_en", desc=True).limit(1).execute()
if res.data:
    agent = res.data[0]
    print(f"ID del Registro: {agent['id']}")
    print(f"ID del Workflow en n8n: {agent['n8n_workflow_id']}")
    print(f"Estado del webhook: Creado ({agent['webhook_url']})")
    agente_id = agent['id']
else:
    print("No se encontraron agentes.")
    agente_id = None

if agente_id:
    print("\n--- AUDITORIA DE SUPABASE (Tabla: logs_conversacion) ---")
    res_logs = supabase.table("logs_conversacion").select("*").eq("agente_id", agente_id).order("creado_en", desc=True).limit(2).execute()
    if res_logs.data:
        for log in res_logs.data:
            print(f"Mensaje registrado: '{log['contenido']}'")
            print(f"Direccion: {log['direccion']}")
            print(f"Timestamp: {log['creado_en']}")
    else:
        print("No se encontraron logs de este agente.")

print("\n--- AUDITORIA DE N8N (API) ---")
n8n_url = "http://localhost:5678/api/v1/workflows"
n8n_user = os.environ.get("N8N_BASIC_AUTH_USER")
n8n_pass = os.environ.get("N8N_BASIC_AUTH_PASSWORD")
headers = {"X-N8N-API-KEY": os.environ.get("N8N_API_KEY")}

try:
    req = httpx.get(n8n_url, headers=headers, auth=(n8n_user, n8n_pass))
    wfs = req.json().get('data', [])
    print(f"Total workflows activos alojados en n8n: {len(wfs)}")
    if wfs:
        print(f"Ultimo workflow: {wfs[0].get('name')} (ID: {wfs[0].get('id')}, Activo: {wfs[0].get('active')})")
except Exception as e:
    print("No se pudo conectar a N8N: " + str(e))
