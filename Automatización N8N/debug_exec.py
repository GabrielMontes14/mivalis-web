"""Verify agents and leads work after owner_user_id fix"""
import asyncio, httpx, os, json

async def main():
    supa_url = os.environ.get("SUPABASE_URL", "")
    supa_anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bWJ3anF6cmt0dXh0eHN3ZXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODY2NjEsImV4cCI6MjA4NjU2MjY2MX0.tkaCupFlKhy6o7C4BmU34zksuC7wdE1rTmBOy91j7dU"
    
    async with httpx.AsyncClient(timeout=15) as client:
        # Login
        login = await client.post(
            f"{supa_url}/auth/v1/token?grant_type=password",
            headers={"apikey": supa_anon, "Content-Type": "application/json"},
            json={"email": "gabo.montes.diaz@gmail.com", "password": "Hola1234."}
        )
        token = login.json().get("access_token")
        print(f"Login: {login.status_code}")
        
        # Test agents
        resp = await client.get("http://localhost:8000/api/v1/agents",
            headers={"Authorization": f"Bearer {token}"})
        print(f"Agents status: {resp.status_code}")
        data = resp.json()
        agents = data.get("data", [])
        print(f"Agents count: {len(agents)}")
        for a in agents:
            name = a.get("config_inyectada", {}).get("nombre_bot", "?")
            estado = a.get("estado", "?")
            print(f"  - {name} | {estado}")
        
        # Test leads
        resp2 = await client.get("http://localhost:8000/api/v1/leads",
            headers={"Authorization": f"Bearer {token}"})
        print(f"Leads status: {resp2.status_code}")
        leads = resp2.json().get("data", [])
        print(f"Leads count: {len(leads)}")

asyncio.run(main())
