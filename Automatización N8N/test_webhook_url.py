
import httpx
import asyncio

async def trigger_test():
    # Construct test URL based on known pattern or check debug_n8n output if available.
    # Pattern: /webhook-test/path
    url = 'http://n8n:5678/webhook-test/agent-967f6057-5336-4ebc-8d5d-b27ee087a87c'
    payload = {
        'telefono': '573001234567',
        'mensaje': 'Hola test url',
        'nombre': 'Test URL User'
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=10)
            print(f'Test URL Status: {resp.status_code}')
            print(f'Test URL Body: {resp.text}')
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    asyncio.run(trigger_test())
