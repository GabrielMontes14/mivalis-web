"""
Script para probar autenticación con n8n y generar API key
"""
import httpx
import json

BASE = "http://n8n:5678"

# Credenciales del owner
EMAIL = "gabo.montes.diaz@gmail.com"
PASSWORD = "Hola1234."

print(f"Intentando login con: {EMAIL} / {PASSWORD}")
print(f"Password bytes: {PASSWORD.encode()}")
print(f"Password len: {len(PASSWORD)}")

client = httpx.Client(timeout=15, base_url=BASE)

# 1. Login
login_data = {"emailOrLdapLoginId": EMAIL, "password": PASSWORD}
print(f"\nRequest body: {json.dumps(login_data)}")

r = client.post("/rest/login", json=login_data)
print(f"\nLogin status: {r.status_code}")
print(f"Login body: {r.text[:300]}")

if r.status_code == 200:
    print("\n✅ Login exitoso!")
    
    # 2. Listar API Keys
    r2 = client.get("/rest/api-keys")
    print(f"\nAPI Keys status: {r2.status_code}")
    print(f"API Keys: {r2.text[:500]}")
    
    # 3. Crear API Key
    r3 = client.post("/rest/api-keys", json={"label": "codavity_test"})
    print(f"\nCreate API Key status: {r3.status_code}")
    print(f"Create API Key response: {r3.text[:500]}")
    
    if r3.status_code in (200, 201):
        data = r3.json()
        api_key = data.get("apiKey", data.get("rawApiKey", "NOT_FOUND"))
        print(f"\n🔑 API KEY: {api_key}")
        
        # 4. Probar API Key
        r4 = httpx.get(f"{BASE}/api/v1/workflows", headers={"X-N8N-API-KEY": api_key}, timeout=10)
        print(f"\nAPI test status: {r4.status_code}")
        print(f"API test body: {r4.text[:300]}")
else:
    print(f"\n❌ Login falló")
    # Intentar sin el punto
    r_alt = client.post("/rest/login", json={"emailOrLdapLoginId": EMAIL, "password": "Hola1234"})
    print(f"Sin punto: {r_alt.status_code} - {r_alt.text[:200]}")

client.close()
