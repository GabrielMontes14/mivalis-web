import os, httpx, asyncio, json, uuid

async def test():
    key = os.environ.get('N8N_API_KEY')
    headers = {'X-N8N-API-KEY': key}
    async with httpx.AsyncClient() as client:
        # Create minimal workflow
        wf_data = {
            'name': 'HackTest', 
            'nodes': [{
                'id': str(uuid.uuid4()),
                'webhookId': str(uuid.uuid4()),
                'name': 'Webhook',
                'type': 'n8n-nodes-base.webhook',
                'typeVersion': 1,
                'position': [0, 0],
                'parameters': {
                    'httpMethod': 'POST',
                    'path': 'hacktest',
                    'options': {
                        'responseMode': 'onReceived'
                    }
                }
            }], 
            'connections': {},
            'settings': {}
        }
        
        r = await client.post('http://n8n:5678/api/v1/workflows', json=wf_data, headers=headers)
        wf = r.json()
        print('Created:', wf.get('id', wf))
        wf_id = wf['id']
        
        # PUT (Simulate UI Save)
        put_payload = {k: v for k, v in wf.items() if k in ['name', 'nodes', 'connections', 'settings', 'tags']}
        r2 = await client.put(f'http://n8n:5678/api/v1/workflows/{wf_id}', json=put_payload, headers=headers)
        print('Updated:', r2.status_code, r2.text)
        
        # Activate
        r3 = await client.post(f'http://n8n:5678/api/v1/workflows/{wf_id}/activate', headers=headers)
        print('Activated:', r3.status_code)
        
        # Trigger Webhook
        r4 = await client.post('http://n8n:5678/webhook/hacktest', json={})
        print('Webhook Hit:', r4.status_code, r4.text)
        
        # Check executions
        await asyncio.sleep(2)
        r5 = await client.get(f'http://n8n:5678/api/v1/executions?workflowId={wf_id}', headers=headers)
        print('Executions:', len(r5.json().get('data', [])), r5.json().get('data', []))

asyncio.run(test())
