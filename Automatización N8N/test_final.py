import asyncio
import httpx
import json

async def test():
    url = "http://host.docker.internal:5678/webhook/agent-dfd19ad9-5ca4-4db4-a48a-aa7a178e13aa"
    payload = {
        "telefono": "573009999999",
        "mensaje": "Hola quiero probar el sistema",
        "nombre": "Test Final"
    }
    
    print(f"Sending to: {url}")
    print(f"Payload: {json.dumps(payload)}")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload)
            print(f"\nStatus: {resp.status_code}")
            print(f"Response: {resp.text[:1000]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    asyncio.run(test())
