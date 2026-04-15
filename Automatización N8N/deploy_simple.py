
import httpx
import os
import json
import asyncio

key = os.environ.get('N8N_API_KEY')
base = 'http://n8n:5678/api/v1'
headers = {'X-N8N-API-KEY': key}

async def deploy_simple():
    workflow = {
        "name": "Simple Test Workflow",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "POST",
                    "path": "test-static",
                    "options": {}
                },
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 1,
                "position": [100, 300]
            }
        ],
        "connections": {},
        "settings": {}
    }
    
    print('Creating workflow...')
    async with httpx.AsyncClient() as client:
        r = await client.post(base + '/workflows', json=workflow, headers=headers)
        print(f'Create Status: {r.status_code}')
        if r.status_code != 200:
            print(r.text)
            return

        wf_data = r.json()
        wf_id = wf_data['id']
        print(f'Workflow ID: {wf_id}')
        
        # Activate
        print('Activating...')
        r_act = await client.post(base + f'/workflows/{wf_id}/activate', headers=headers, timeout=10)
        print(f'Activate Status: {r_act.status_code}')
        
        # Trigger
        print('Triggering...')
        url = 'http://n8n:5678/webhook/test-static'
        try:
            r_trig = await client.post(url, json={'test': 'true'}, timeout=10)
            print(f'Webhook Status: {r_trig.status_code}')
            print(f'Webhook Body: {r_trig.text}')
        except Exception as e:
            print(f'Trigger Error: {e}')

if __name__ == '__main__':
    asyncio.run(deploy_simple())
