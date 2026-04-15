
import httpx
import os
import sys

key = os.environ.get('N8N_API_KEY')
base = 'http://n8n:5678/api/v1'
headers = {'X-N8N-API-KEY': key}

try:
    # 1. Find Workflow
    r = httpx.get(base + '/workflows', headers=headers)
    wfs = r.json().get('data', [])
    target = next((w for w in wfs if 'Fixed Node Agent Final 4' in w['name']), None)
    
    if target:
        print(f'Workflow Found: {target["id"]}')
        
        # 2. Deactivate
        print('Deactivating...')
        r_de = httpx.post(base + f'/workflows/{target["id"]}/deactivate', headers=headers)
        print(f'Deactivate Status: {r_de.status_code}')
        
        # 3. Activate
        print('Activating...')
        r_ac = httpx.post(base + f'/workflows/{target["id"]}/activate', headers=headers)
        print(f'Activate Status: {r_ac.status_code}')
        print(f'Activate Body: {r_ac.text}')
        
    else:
        print('Workflow not found')

except Exception as e:
    print(f'Error: {e}')
