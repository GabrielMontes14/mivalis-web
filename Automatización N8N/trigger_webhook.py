
import httpx
import asyncio

async def trigger():
    url = 'http://n8n:5678/webhook/agent-32b2e231-c3fb-4b34-a208-0bfeb4941a71'
    payload = {
        'telefono': '573001234567',
        'mensaje': 'Hola despues de reinicio',
        'nombre': 'Test Restart'
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=10)
            print(f'Status: {resp.status_code}')
            print(f'Body: {resp.text}')
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    asyncio.run(trigger())
