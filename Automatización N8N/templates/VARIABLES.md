# Variables Dinámicas para sales_v1

Este documento describe todas las variables que deben ser proporcionadas en `config_personalizada` al desplegar un agente `sales_v1`.

## Variables Requeridas

| Variable | Tipo | Descripción | Ejemplo |
|----------|------|-------------|---------|
| `empresa_nombre` | string | Nombre de la empresa del cliente | "Ferretería El Martillo" |
| `prompt_sistema` | string | System prompt completo con variables ya reemplazadas | Ver ejemplo abajo |

## Variables Opcionales

| Variable | Tipo | Descripción | Ejemplo | Default |
|----------|------|-------------|---------|---------|
| `nombre_bot` | string | Nombre personalizado del bot | "Marti-Bot" | "Asistente de IA" |
| `descripcion_negocio` | string | Descripción del negocio | "Vendemos herramientas..." | "" |
| `lista_productos` | string | Lista de productos/servicios | "Taladros, Sierras, EPP" | "" |
| `objetivo_conversion` | string | Meta del embudo de ventas | "Agendar una visita técnica" | "Agendar una cita" |
| `link_agenda` | string | URL de Calendly/Cal.com | "https://cal.com/empresa/cita" | "" |
| `link_pago` | string | URL de checkout/pago | "https://empresa.com/pagar" | "" |

## Cómo Construir el `prompt_sistema`

El `prompt_sistema` debe ser el resultado de reemplazar los placeholders de la plantilla `sales_v1_system_prompt.md` con los valores específicos del cliente.

**Opción 1: Reemplazo manual (cliente construye el prompt)**
```python
# El cliente lee la plantilla y reemplaza manualmente
with open("templates/prompts/sales_v1_system_prompt.md") as f:
    prompt_template = f.read()

prompt_sistema = prompt_template.replace("{{EMPRESA_NOMBRE}}", "Ferretería El Martillo")
prompt_sistema = prompt_sistema.replace("{{NOMBRE_BOT}}", "Marti-Bot")
# ... etc
```

**Opción 2: Reemplazo automático (backend construye el prompt)**
```python
# El backend puede construir el prompt automáticamente si se pasan las variables individuales
# Esto requeriría modificar DeployService para leer la plantilla de prompt y reemplazar
```

## Ejemplo Completo de Request

Ver `templates/examples/deploy_request_example.json`

## Placeholders en el Workflow JSON

Los siguientes placeholders serán reemplazados en el JSON del workflow de n8n:

- `{{EMPRESA_NOMBRE}}` → Nombre de la empresa
- `{{NOMBRE_BOT}}` → Nombre del bot
- `{{DESCRIPCION_NEGOCIO}}` → Descripción del negocio
- `{{LISTA_PRODUCTOS}}` → Lista de productos
- `{{OBJETIVO_CONVERSION}}` → Objetivo de conversión
- `{{LINK_AGENDA}}` → URL de agenda
- `{{LINK_PAGO}}` → URL de pago
- `{{CLIENTE_ID}}` → UUID del cliente (inyectado automáticamente)
- `{{PROMPT_SISTEMA}}` → System prompt completo

**Nota:** El workflow maestro `sales_v1.json` debe incluir estos placeholders en los nodos correspondientes (especialmente en el nodo "AI Agent").
