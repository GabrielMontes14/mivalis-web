import asyncio
import json
import httpx
import time
from app.core.config import settings

async def test_and_check():
    headers = {"X-N8N-API-KEY": settings.N8N_API_KEY, "Content-Type": "application/json"}
    auth_creds = (settings.N8N_BASIC_AUTH_USER, settings.N8N_BASIC_AUTH_PASSWORD) if settings.N8N_BASIC_AUTH_USER else None
    
    webhook_url = "http://host.docker.internal:5678/webhook/agent-dfd19ad9-5ca4-4db4-a48a-aa7a178e13aa"
    payload = {"telefono": "573001119999", "mensaje": "Hola, necesito información", "nombre": "Gabriel"}
    
    print("1. Sending test...")
    async with httpx.AsyncClient(timeout=120.0) as http:
        resp = await http.post(webhook_url, json=payload)
        print(f"   Status: {resp.status_code}")
        print(f"   Body: {resp.text[:500]}")
    
    print("\n2. Waiting 3 seconds for n8n to finish execution...")
    time.sleep(3)
    
    print("\n3. Checking executions...")
    async with httpx.AsyncClient(timeout=30.0, auth=auth_creds) as http:
        r = await http.get(f"{settings.N8N_API_URL}/executions", params={"limit": 5}, headers=headers)
        execs = r.json()
        
        for e in execs.get("data", [])[:3]:
            eid = e["id"]
            print(f"\n   === Execution {eid}: status={e.get('status')} finished={e.get('finished')} ===")
            
            r2 = await http.get(f"{settings.N8N_API_URL}/executions/{eid}", headers=headers)
            full = r2.json()
            
            # Print complete raw resultData
            rd = full.get("data", {}).get("resultData", {})
            
            # Global execution error
            if rd.get("error"):
                print(f"   GLOBAL ERROR: {json.dumps(rd['error'], ensure_ascii=False)[:500]}")
            
            # Last node
            print(f"   Last node: {rd.get('lastNodeExecuted', 'N/A')}")
            
            # Run data
            run_data = rd.get("runData", {})
            if not run_data:
                print("   No runData!")
                # Print raw keys
                print(f"   data keys: {list(full.get('data', {}).keys())}")
                print(f"   resultData keys: {list(rd.keys())}")
                # Try printing full execution data (limited)
                raw = json.dumps(full, ensure_ascii=False)
                print(f"   Full execution data (truncated): {raw[:1000]}")
            else:
                for node_name, runs in run_data.items():
                    for run in runs:
                        err = run.get("error")
                        if err:
                            print(f"   [{node_name}] ERROR: {json.dumps(err, ensure_ascii=False)[:400]}")
                        else:
                            main_data = run.get("data", {}).get("main", [])
                            items = []
                            for mlist in main_data:
                                if mlist:
                                    for item in mlist:
                                        items.append(item.get("json", {}))
                            preview = json.dumps(items, ensure_ascii=False)[:200]
                            print(f"   [{node_name}] OK -> {preview}")

asyncio.run(test_and_check())
