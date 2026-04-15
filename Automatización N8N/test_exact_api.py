import os, httpx, asyncio, json, uuid

async def test():
    key = os.environ.get('N8N_API_KEY')
    headers = {'X-N8N-API-KEY': key}
    async with httpx.AsyncClient() as client:
        r = await client.get('http://n8n:5678/api/v1/workflows', headers=headers)
        workflows = r.json().get('data', [])
        supertest = next((w for w in workflows if w['name'] == 'SuperTest Workflow'), None)
        
        # Clonar
        new_wf = {
            'name': 'SuperTest API Clone',
            'nodes': supertest['nodes'].copy(),
            'connections': supertest['connections'],
            'settings': {}
        }
        
        # Modificar path del nodo webhook para que sea nuevo
        new_wf['nodes'][0]['parameters']['path'] = 'supertest2'
        new_wf['nodes'][0]['id'] = str(uuid.uuid4())
        new_wf['nodes'][0]['webhookId'] = str(uuid.uuid4())
        
        print("Creating clone...")
        r_create = await client.post('http://n8n:5678/api/v1/workflows', json=new_wf, headers=headers)
        wf_created = r_create.json()
        print("Creation REsponse:", r_create.text)
        wf_id = wf_created.get('id')
        if not wf_id: return
        
        print("Activating clone...")
        r_act = await client.post(f'http://n8n:5678/api/v1/workflows/{wf_id}/activate', headers=headers)
        print("Activated:", r_act.status_code)
        
        print("Hitting webhook supertest2 via GET...")
        await asyncio.sleep(2)
        r_hook = await client.get('http://n8n:5678/webhook/supertest2')
        print("Webhook Status:", r_hook.status_code, r_hook.text)

asyncio.run(test())
