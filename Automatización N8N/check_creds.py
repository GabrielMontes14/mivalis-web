
import httpx, os, json, sys

key = os.environ.get('N8N_API_KEY')
base = 'http://n8n:5678/api/v1'
headers = {'X-N8N-API-KEY': key}

try:
    r = httpx.get(base + '/credentials', headers=headers)
    creds = r.json().get('data', [])
    
    print(f'Found {len(creds)} credentials.')
    found = False
    for c in creds:
        print(f'ID: {c["id"]} Name: {c["name"]} Type: {c["type"]}')
        if c['id'] == 'trwYcbt9fPSzyHGO':
            found = True
            
    if found:
        print('Credential trwYcbt9fPSzyHGO FOUND.')
    else:
        print('Credential trwYcbt9fPSzyHGO NOT FOUND.')

except Exception as e:
    print('Error:', e)
