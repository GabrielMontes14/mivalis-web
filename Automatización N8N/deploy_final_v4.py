
import asyncio, json, traceback, sys, logging, httpx
from app.services.deploy_service import DeployService
from app.services.supabase_service import SupabaseService

logging.basicConfig(level=logging.INFO)

async def verify_flow():
    user_id = 'bb44dcc3-979f-458d-b375-29ab69eddee4'
    cliente_id = 'f76edde5-7de2-49eb-acdb-30e32627a00c'
    
    # 1. Deploy
    print('=== 1. DEPLOYING FINAL V4 ===', flush=True)
    try:
        result = await DeployService.deploy_agent(
            user_id=user_id,
            plantilla_ref='sales_v1',
            config_personalizada={
                'cliente_id': cliente_id,
                'empresa_nombre': 'Fixed Node Agent Final 4',
                'nombre_bot': 'FixBot4',
                'prompt_sistema': 'Testing final flow v4'
            }
        )
        print('Subject Agent ID:', result['agente_id'], flush=True)
        webhook_url = result['webhook_url']
        print('Webhook:', webhook_url, flush=True)

        # 2. Trigger Webhook
        print('=== 2. TRIGGERING WEBHOOK ===', flush=True)
        internal_webhook = webhook_url.replace('host.docker.internal', 'n8n').replace('localhost', 'n8n')
        print('Internal Webhook:', internal_webhook, flush=True)
        
        
        payload = {
            'telefono': '573001234567',
            'mensaje': 'Hola quiero comprar final v4',
            'nombre': 'Juan Final'
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(internal_webhook, json=payload, timeout=30)
            print('Webhook Response:', resp.status_code, resp.text, flush=True)
            
        # 3. Check DB Logs
        print('=== 3. CHECKING DB LOGS ===', flush=True)
        await asyncio.sleep(5) 
        
        sb_client = SupabaseService.get_client()
        r = sb_client.table('logs_conversacion').select('*') \
            .eq('agente_id', result['agente_id']) \
            .eq('direccion', 'entrante') \
            .execute()
            
        if r.data:
            print('LOG FOUND:', r.data[0]['contenido'], flush=True)
            print('VERIFICATION SUCCESS', flush=True)
        else:
            print('LOG NOT FOUND', flush=True)

    except Exception as e:
        print('FAILED!', flush=True)
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(verify_flow())
