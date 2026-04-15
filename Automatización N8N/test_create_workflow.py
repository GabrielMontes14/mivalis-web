"""Test crear workflow mínimo en n8n via Public API"""
import httpx
import json
import os

key = os.environ.get("N8N_API_KEY", "")
api_url = os.environ.get("N8N_API_URL", "http://host.docker.internal:5678/api/v1")

headers = {"X-N8N-API-KEY": key, "Content-Type": "application/json"}

# Workflow mínimo
minimal_workflow = {
    "name": "Test Minimal Workflow",
    "nodes": [
        {
            "parameters": {
                "path": "test-webhook",
                "responseMode": "lastNode",
                "options": {}
            },
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1,
            "position": [100, 300]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": '{"msg": "ok"}',
                "options": {}
            },
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1,
            "position": [300, 300]
        }
    ],
    "connections": {
        "Webhook": {
            "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
        }
    }
}

print(f"API URL: {api_url}")
print(f"API Key (first 20): {key[:20]}...")
print(f"Payload: {json.dumps(minimal_workflow, indent=2)[:300]}")

r = httpx.post(f"{api_url}/workflows", headers=headers, json=minimal_workflow, timeout=15)
print(f"\nStatus: {r.status_code}")
print(f"Response: {r.text[:500]}")

if r.status_code != 200:
    print(f"\n--- Full response ---")
    print(r.text)
