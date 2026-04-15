# Codavity API

API de gestión para el Motor de Agentes SaaS de Codavity.

## Estructura del Proyecto

```
api/
├── main.py                 # Punto de entrada de FastAPI
├── requirements.txt        # Dependencias Python
├── Dockerfile             # Construcción de imagen Docker
├── app/
│   ├── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py      # Configuración global (Pydantic Settings)
│   │   └── dependencies.py # Inyección de dependencias (JWT auth)
│   ├── api/
│   │   └── v1/
│   │       ├── health.py   # Endpoint /health
│   │       └── deploy.py   # Endpoint /api/v1/deploy
│   ├── schemas/
│   │   └── deploy.py       # Modelos Pydantic (request/response)
│   ├── services/           # (Pendiente) Lógica de negocio
│   └── models/             # (Pendiente) Modelos de base de datos
└── templates/              # JSONs de workflows maestros (montado como volumen)
```

## Instalación Local

```bash
cd api
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Configuración

Crear un archivo `.env` en la raíz del directorio `api/` con:

```env
ENVIRONMENT=development
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret
N8N_API_URL=http://n8n:5678/api/v1
N8N_API_KEY=your-n8n-api-key
TEMPLATES_DIR=../templates
```

## Ejecución

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

La API estará disponible en:
- **http://localhost:8000** — Root
- **http://localhost:8000/docs** — Swagger UI (solo dev)
- **http://localhost:8000/health** — Health check

## Testing del Endpoint de Health

```bash
curl http://localhost:8000/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "service": "codavity-api",
  "timestamp": "2026-02-13T14:42:00.000000",
  "version": "1.0.0"
}
```

## Próximos Pasos

1. Implementar lógica de `/api/v1/deploy`
2. Crear servicios para interacción con Supabase
3. Crear servicios para interacción con n8n API
4. Implementar retry logic con `tenacity`
5. Testing unitario y de integración
