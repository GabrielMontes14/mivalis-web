import json

with open("templates/sales_v1.json", "r", encoding="utf-8") as f:
    wf = json.load(f)

new_nodes = []
for node in wf["nodes"]:
    if node["type"] == "n8n-nodes-base.supabase":
        if node["name"] == "Upsert Lead":
            new_node = {
                "parameters": {
                    "method": "POST",
                    "url": "{{SUPABASE_URL}}/rest/v1/leads",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "apikey", "value": "{{SUPABASE_KEY}}"},
                            {"name": "Authorization", "value": "Bearer {{SUPABASE_KEY}}"},
                            {"name": "Prefer", "value": "resolution=merge-duplicates"}
                        ]
                    },
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": "={ \n  \"telefono\": \"{{ $json.body.telefono }}\", \n  \"nombre\": \"{{ $json.body.nombre || '' }}\", \n  \"cliente_id\": \"{{CLIENTE_ID}}\", \n  \"agente_id\": \"{{AGENTE_ID}}\", \n  \"score_interes\": 50, \n  \"estado\": \"nuevo\", \n  \"ultimo_contacto\": \"{{ new Date().toISOString() }}\" \n}"
                },
                "name": node["name"],
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.1,
                "position": node["position"],
                "id": node.get("id", "")
            }
            new_nodes.append(new_node)
        elif node["name"] == "Log User Message":
            new_node = {
                "parameters": {
                    "method": "POST",
                    "url": "{{SUPABASE_URL}}/rest/v1/logs_conversacion",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "apikey", "value": "{{SUPABASE_KEY}}"},
                            {"name": "Authorization", "value": "Bearer {{SUPABASE_KEY}}"}
                        ]
                    },
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": "={ \n  \"lead_id\": \"{{ $('Upsert Lead').item.json[0].id }}\", \n  \"agente_id\": \"{{AGENTE_ID}}\", \n  \"cliente_id\": \"{{CLIENTE_ID}}\", \n  \"contenido\": \"{{ $('Webhook').item.json.body.mensaje }}\", \n  \"direccion\": \"entrante\", \n  \"tipo_mensaje\": \"texto\" \n}"
                },
                "name": node["name"],
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.1,
                "position": node["position"],
                "id": node.get("id", "")
            }
            new_nodes.append(new_node)
        elif node["name"] == "Log Conversation":
            new_node = {
                "parameters": {
                    "method": "POST",
                    "url": "{{SUPABASE_URL}}/rest/v1/logs_conversacion",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "apikey", "value": "{{SUPABASE_KEY}}"},
                            {"name": "Authorization", "value": "Bearer {{SUPABASE_KEY}}"}
                        ]
                    },
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": "={ \n  \"lead_id\": \"{{ $('Upsert Lead').item.json[0].id }}\", \n  \"agente_id\": \"{{AGENTE_ID}}\", \n  \"cliente_id\": \"{{CLIENTE_ID}}\", \n  \"contenido\": \"{{ $json.output }}\", \n  \"direccion\": \"saliente\", \n  \"tipo_mensaje\": \"texto\" \n}"
                },
                "name": node["name"],
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.1,
                "position": node["position"],
                "id": node.get("id", "")
            }
            new_nodes.append(new_node)
    else:
        new_nodes.append(node)

wf["nodes"] = new_nodes

with open("templates/sales_v1.json", "w", encoding="utf-8") as f:
    json.dump(wf, f, indent=4)
print("Template rewritten successfully!")
