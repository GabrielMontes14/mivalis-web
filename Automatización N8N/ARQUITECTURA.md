# ARQUITECTURA.md — La Estructura Técnica

> Este documento define la tubería de datos para que el motor de Codavity sea determinista y profesional.

---

## Diagrama de Flujo General

```
[Cliente / Frontend]
        │
        ▼
[FastAPI — POST /api/deploy]
        │
        ├── Valida JWT (Supabase Auth)
        ├── Verifica créditos del cliente
        ├── Lee JSON Plantilla desde /templates
        ├── Inyecta variables dinámicas
        │
        ▼
[API n8n — POST /workflows]
        │
        ├── Crea workflow clonado
        ├── POST /workflows/{id}/activate
        │
        ▼
[Respuesta: { webhook_url, workflow_id }]
```

---

## Capas de la Arquitectura

| Capa                | Tecnología   | Responsabilidad                                                        |
|---------------------|-------------|------------------------------------------------------------------------|
| **Management Plane** | FastAPI      | Autenticación JWT, validación de payload, orquestación de despliegues.|
| **Data Plane**       | n8n          | Ejecución de agentes, procesamiento de mensajes, lógica de IA.        |
| **Persistencia**     | Supabase/PG  | Usuarios, leads, logs, créditos, estados de agentes (con RLS).        |
| **IA**               | Gemini 3 Flash | Procesamiento de lenguaje natural para el agente de ventas.          |

---

## Autenticación

> **Decisión:** Supabase Auth integrado con JWT Bearer Tokens.

```
[Frontend] ──► [Supabase Auth (Login)] ──► [JWT Access Token]
                                                │
[FastAPI] ◄── Authorization: Bearer <token> ────┘
    │
    ├── Verifica firma JWT con Supabase Secret
    ├── Extrae user_id (= cliente_id)
    └── Pasa contexto a queries SQL → RLS filtra automáticamente
```

---

## Estrategia de Plantillas

> **Decisión:** JSON estático en el repositorio (inmutable en producción).

```
📁 /templates
├── sales_v1.json        ← Agente de Ventas y Agendamiento
├── support_v1.json      ← (Futuro) Agente de Soporte
└── onboarding_v1.json   ← (Futuro) Agente de Onboarding
```

**Ciclo de vida:**
1. **Desarrollo:** Diseño y pruebas en n8n (ambiente dev).
2. **Freeze:** Exportación del JSON validado.
3. **Deploy:** Commit en `/templates` (versionado con Git).
4. **Ejecución:** FastAPI lee el archivo local "congelado" para clonar.

---

## Estrategia de Resiliencia

### A) Fallo en el Despliegue — Retry + Dead Letter Queue

```
[FastAPI llama a n8n API]
        │
        ├── Intento 1 → Fallo → espera 2s
        ├── Intento 2 → Fallo → espera 5s
        ├── Intento 3 → Fallo → espera 10s
        │
        ▼ (3 fallos consecutivos)
[estado = 'error_critico' en agentes_desplegados]
        │
        ├── Alerta a Codavity Admin (Telegram/Slack)
        └── Respuesta al cliente: "Tu agente está en cola de revisión manual."
```

- **Nunca** exponer errores técnicos al cliente final (nada de "Error 500").
- El admin recibe el stack trace completo para depuración inmediata.

### B) Agotamiento de Créditos — Sobregiro de Gracia

```
Créditos: 3 → 2 → 1 → 0 → -1 (TRIGGER) → ... → -10 → -11 (CORTE)
                                  │                            │
                                  ▼                            ▼
                    [Upsell: "Recarga ahora"]     [Agente offline]
```

| Umbral        | Acción                                                           |
|---------------|------------------------------------------------------------------|
| `= 0 → -1`   | Trigger de Upsell: Email/WhatsApp al dueño del agente.          |
| `-1 a -10`    | Agente sigue operando (gracia para no perder ventas en curso).  |
| `< -10`       | Agente responde: "Fuera de servicio, contacta a un humano."     |

### C) Rate Limiting — Filtro Anti-Spam en n8n

```
[Webhook recibe mensaje]
        │
        ▼
[Nodo 1: Consultar leads → last_message_at + msg_count_1min]
        │
        ├── > 10 msgs/min → Devolver 200 OK vacío (silenciar, NO invocar IA)
        └── ≤ 10 msgs/min → Continuar flujo normal
```

---

## Modelo de IA y Memoria

> **Modelo:** Gemini 3 Flash (costo-eficiente, baja latencia).

### Estrategia de Memoria Híbrida

```
[Mensaje nuevo del usuario]
        │
        ▼
[Cargar contexto]
        ├── chat_history: últimos 6 mensajes (de logs_conversacion)
        └── user_summary: resumen del perfil (de leads.contexto_conversacion)
        │
        ▼
[Gemini 3 Flash procesa con ambos contextos]
        │
        ▼
[Cada 5 turnos] → Nodo secundario genera resumen actualizado → UPDATE leads.contexto_conversacion
```

---

## Esquema de Datos

### Input (JSON de Configuración del Cliente)

```json
{
  "cliente_id": "ID_UNICO_SaaS",
  "plantilla_ref": "sales_v1",
  "config_personalizada": {
    "empresa_nombre": "Texto",
    "api_key_service": "Secret_Token",
    "prompt_sistema": "Instrucciones_IA"
  }
}
```

### Output (Respuesta del Motor)

```json
{
  "status": "success",
  "cliente_id": "ID_UNICO_SaaS",
  "workflow_id": "n8n_workflow_id",
  "webhook_url": "https://n8n.codavity.com/webhook/xxxxx",
  "activated_at": "2026-02-12T18:00:00-05:00"
}
```

---

## Mapa de Endpoints

### FastAPI (Management Plane)

| Método | Endpoint            | Descripción                                      |
|--------|---------------------|--------------------------------------------------|
| POST   | `/api/deploy`       | Despliega un nuevo agente para un cliente.       |
| GET    | `/api/status/{id}`  | Consulta el estado de un agente desplegado.      |
| DELETE | `/api/agent/{id}`   | Desactiva y elimina un agente de un cliente.     |
| GET    | `/api/leads`        | Lista leads del cliente autenticado (filtrado JWT).|
| GET    | `/api/creditos`     | Consulta saldo de créditos del cliente.          |

### n8n (Data Plane — API interna, no pública)

| Método | Endpoint                        | Descripción                                      |
|--------|---------------------------------|--------------------------------------------------|
| POST   | `/workflows`                    | Creación del flujo a partir del JSON maestro.    |
| POST   | `/workflows/{id}/activate`      | Activación inmediata del servicio.               |
| GET    | `/workflows/{id}`               | Consultar estado de un workflow desplegado.       |
| PUT    | `/workflows/{id}`               | Actualizar configuración de un workflow activo.   |

---

## Infraestructura — Docker Compose

> **Decisión:** VPS propio (DigitalOcean/Hetzner) con Docker Compose.

```
┌──────────────────────────────────────────────────────────────┐
│                        VPS (Docker Host)                     │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │   Traefik    │    │    n8n      │    │  FastAPI    │      │
│  │  :80 / :443  │───►│   :5678    │    │   :8000    │      │
│  │  SSL auto    │    │ Data Plane  │◄───│ Mgmt Plane │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                              │
│  hooks.codavity.com  →  n8n (webhooks + UI)                 │
│  api.codavity.com    →  FastAPI (despliegues + gestión)      │
└──────────────────────────────────────────────────────────────┘
```

- **Traefik:** Reverse proxy con SSL automático via Let's Encrypt.
- **n8n:** Ejecución de agentes, expuesto solo a través de Traefik.
- **FastAPI:** Comunica con n8n internamente vía red Docker (`http://n8n:5678`).

---

## Operaciones Day-2

### Actualización de Prompt (Cambio Menor)

```
[Cliente solicita cambio] → PUT /api/agent/{id}/prompt → PUT n8n /workflows/{id} → OK
```

- Se modifica el workflow **en caliente** vía `PUT`.
- **Nunca** se borra y recrea el workflow (preservar Webhook URL).

### Migración de Versión de Plantilla (Cambio Mayor)

```
Plantilla v1 → Plantilla v2 (nueva en /templates)
```

| Regla                      | Detalle                                                        |
|----------------------------|----------------------------------------------------------------|
| **Pinned Versions**        | Los clientes se quedan en su versión actual hasta decidir.     |
| **Migración manual**       | Botón en dashboard futuro: "Actualizar a v2 (Riesgoso)".      |
| **Sin auto-update**        | Nunca migrar automáticamente — riesgo de tumbar 100 clientes.  |
