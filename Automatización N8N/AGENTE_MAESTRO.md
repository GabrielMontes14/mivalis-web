# AGENTE_MAESTRO.md — La Lógica del Negocio

> Este archivo describe el "ADN" del primer producto de Codavity: el **Agente de Ventas y Agendamiento**.

---

## Flujo del Agente

```
[Mensaje Entrante] ──► [Leer Prompt del Sistema] ──► [Procesar con IA] ──► [Ejecutar Acción] ──► [Confirmar + Guardar Log]
```

### Paso a Paso:

1. **Trigger:** Entrada de mensaje vía WhatsApp o Chat Web.
2. **Contexto:** La IA lee el `prompt_sistema` inyectado para definir su personalidad y conocimiento del negocio del cliente.
3. **Acción:** Si el usuario solicita una cita, la IA debe extraer la fecha/hora y llamar al nodo de calendario correspondiente.
4. **Cierre:** El agente confirma la acción al usuario y guarda el log completo en la base de datos del proyecto.

---

## Variables Dinámicas

Estas son las partes del agente que **cambian por cada cliente** al momento del despliegue:

| Variable            | Descripción                                                    | Ejemplo                                      |
|---------------------|----------------------------------------------------------------|----------------------------------------------|
| `system_prompt`     | Lo que hace único a cada agente vendido. Define personalidad, tono y conocimiento del negocio. | "Eres el asistente de ventas de Ferretería El Martillo..." |
| `credentials_id`    | El vínculo a las cuentas de mensajería del cliente final.       | ID de credencial de WhatsApp Business API    |
| `empresa_nombre`    | Nombre comercial del cliente para personalización de mensajes.  | "Ferretería El Martillo"                     |
| `catalogo_servicios`| Lista de productos/servicios que el agente puede consultar.     | JSON o referencia a tabla en Supabase        |

---

## Componentes Fijos (No cambian entre clientes)

- Estructura base del workflow en n8n.
- Nodo de conexión a Supabase para logging.
- Lógica de clasificación de intención del usuario.
- Nodo de respuesta y formateo de mensajes.

---

## Estrategia de IA — Adaptador Modular

> **Decisión:** No usar nodos nativos de Gemini hardcodeados. Usar el nodo **"AI Agent" (LangChain)** donde el modelo es una entrada variable.

```
┌──────────────────────────────────────┐
│          Nodo AI Agent               │
│                                      │
│  ┌──────────────┐  ← Intercambiable  │
│  │ Model Sub-node│                   │
│  │ (Gemini Flash)│                   │
│  └──────────────┘                    │
│                                      │
│  ┌──────────┐ ┌──────────┐           │
│  │  Tools   │ │ Memory   │  ← Fijos  │
│  └──────────┘ └──────────┘           │
│                                      │
│  System Prompt ← Variable dinámica   │
└──────────────────────────────────────┘
```

**Si Google cambia precios o depreca Gemini:**
1. Se cambia el "Model Sub-node" en la plantilla maestra por Anthropic u Ollama.
2. Se re-exporta el JSON y se guarda en `/templates`.
3. Los nuevos despliegues usan el nuevo modelo. Los existentes siguen en su versión (Pinned Versions).

### Modelo por Defecto

| Componente           | Modelo                  | Propósito                           |
|----------------------|-------------------------|-------------------------------------|
| **Agente Principal** | Gemini 3 Flash          | Conversación, ventas, agendamiento |
| **Resumen de Perfil**| Gemini 3 Flash (cheap)  | Generar `user_summary` cada 5 turnos|

### Inputs del Nodo de IA

| Input            | Tipo     | Fuente                              |
|------------------|----------|-------------------------------------|
| `chat_history`   | Array    | Últimos 6 mensajes de `logs_conversacion` |
| `user_summary`   | String   | Campo `contexto_conversacion` de `leads`  |
| `system_prompt`  | String   | Inyectado desde `config_personalizada`    |
