import json

with open("templates/sales_v1.json", "r", encoding="utf-8") as f:
    wf = json.load(f)

for node in wf["nodes"]:
    if node["type"] == "n8n-nodes-base.httpRequest":
        params = node["parameters"]
        # Update URL
        if "url" in params:
            params["url"] = params["url"].replace("{{SUPABASE_URL}}", "={{ $env.SUPABASE_URL }}")
        
        # Update Headers
        if "headerParameters" in params and "parameters" in params["headerParameters"]:
            for hp in params["headerParameters"]["parameters"]:
                if hp["value"] == "{{SUPABASE_KEY}}":
                    hp["value"] = "={{ $env.SUPABASE_SERVICE_KEY }}"
                elif hp["value"] == "Bearer {{SUPABASE_KEY}}":
                    hp["value"] = "=Bearer {{ $env.SUPABASE_SERVICE_KEY }}"

with open("templates/sales_v1.json", "w", encoding="utf-8") as f:
    json.dump(wf, f, indent=4)
print("Environment variables injected into workflow JSON successfully.")
