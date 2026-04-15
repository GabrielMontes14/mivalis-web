
import httpx, os, json, sys

key = os.environ.get('N8N_API_KEY')
# Use 'n8n' service name as we are in same docker network
base = 'http://n8n:5678/api/v1'
headers = {'X-N8N-API-KEY': key}

try:
    # 1. Find Workflow
    r = httpx.get(base + '/workflows', headers=headers)
    if r.status_code != 200:
        print(f'Error listing workflows: {r.status_code} {r.text}')
        sys.exit(1)
        
    wfs = r.json().get('data', [])
    target = None
    for w in wfs:
        if 'Fixed Node Agent Final 4' in w['name']:
            target = w
            break

    if target:
        print(f'Workflow: {target["name"]} ({target["id"]}) Active: {target.get("active", False)}')
        
        r_detail = httpx.get(base + f'/workflows/{target["id"]}', headers=headers)
        print(f'Detail Status: {r_detail.status_code}')
        if r_detail.status_code != 200:
             print(f'Error Text: {r_detail.text}')
        
        try:
            wf_detail = r_detail.json()
        except:
            wf_detail = {}
            
        print(f'WF Detail Type: {type(wf_detail)}')
        try:
            print(f'WF Detail Keys: {list(wf_detail.keys())}')
        except:
            print(f'WF Detail Content: {wf_detail}')
            
        nodes = wf_detail.get('nodes', [])
        print(f'Nodes Count: {len(nodes)}')
        
        for node in nodes:
            print(f'Node Type: {node["type"]}')
            if node['type'] == 'n8n-nodes-base.webhook':
                print(f'Webhook Node Path: {node["parameters"].get("path")}')
                print(f'Webhook Node Method: {node["parameters"].get("httpMethod")}')
        
        r2 = httpx.get(base + f'/executions', params={'workflowId': target['id'], 'limit': 1}, headers=headers)
        ex_data = r2.json()
        execs = ex_data.get('data', [])
        
        if execs:
            last_exec = execs[0]
            print(f'Last Execution: {last_exec["id"]} Finished: {last_exec["finished"]} Mode: {last_exec["mode"]}')
            # Detailed info check
            # r3 = httpx.get(base + f'/executions/{last_exec["id"]}', headers=headers)
            # print(json.dumps(r3.json(), indent=2))
        else:
            print('No executions found.')
            
    else:
        print('Workflow not found.')

except Exception as e:
    print('Error:', e)
