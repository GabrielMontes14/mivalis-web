# Guía: Completar la Prueba End-to-End con JWT Real

## Resultados Actuales del Test

```
✅ PASS — Health Check
✅ PASS — Supabase Connection
✅ PASS — Template Exists
❌ FAIL — Deploy Endpoint (403 Not authenticated - esperado sin JWT)
```

**Estado:** 3/4 tests pasados. El sistema está funcionando correctamente.

---

## Pasos para Completar el Test (Obtener 4/4)

### Paso 1: Crear Usuario en Supabase Auth

1. Ir a tu proyecto Supabase → Authentication → Users
2. Click en "Add user" → "Create new user"
3. Ingresar:
   - Email: `test@codavity.com`
   - Password: `Test123456!`
   - Confirmar email automáticamente: ✅

4. Copiar el **User UID** que aparece en la lista (formato: `550e8400-e29b-41d4-a716-446655440000`)

### Paso 2: Insertar Cliente en la Base de Datos

Ejecutar este SQL en Supabase SQL Editor:

```sql
INSERT INTO clientes (
    empresa_nombre,
    email,
    plan,
    estado,
    creditos_mensuales,
    creditos_plan_base,
    supabase_user_id
) VALUES (
    'Ferretería El Martillo',
    'test@codavity.com',
    'profesional',
    'activo',
    500,
    500,
    'PEGAR_AQUI_EL_USER_UID_DEL_PASO_1'
);
```

**Importante:** Reemplazar `PEGAR_AQUI_EL_USER_UID_DEL_PASO_1` con el UUID real del usuario.

### Paso 3: Insertar la Plantilla sales_v1

```sql
INSERT INTO plantillas (
    ref_nombre,
    descripcion,
    version,
    archivo_json,
    variables_requeridas,
    activa
) VALUES (
    'sales_v1',
    'Agente de Ventas y Agendamiento - Placeholder',
    1,
    'sales_v1.json',
    '["empresa_nombre", "nombre_bot", "descripcion_negocio", "lista_productos", "objetivo_conversion", "link_agenda", "prompt_sistema"]',
    true
);
```

### Paso 4: Obtener el JWT del Usuario

**Opción A: Usando la API de Supabase (Recomendado)**

Ejecutar este comando desde PowerShell:

```powershell
$body = @{
    email = "test@codavity.com"
    password = "Test123456!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://TU_PROYECTO.supabase.co/auth/v1/token?grant_type=password" `
    -Method POST `
    -Headers @{
        "apikey" = "TU_ANON_KEY"
        "Content-Type" = "application/json"
    } `
    -Body $body

$response.access_token
```

**Opción B: Desde el código Python**

Crear un archivo `get_jwt.py`:

```python
from supabase import create_client
import os

SUPABASE_URL = "https://TU_PROYECTO.supabase.co"
SUPABASE_ANON_KEY = "TU_ANON_KEY"

client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Autenticar
response = client.auth.sign_in_with_password({
    "email": "test@codavity.com",
    "password": "Test123456!"
})

print(f"JWT: {response.session.access_token}")
```

### Paso 5: Ejecutar el Test con el JWT

**Opción A: Variable de entorno**

```powershell
$env:TEST_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
docker exec codavity_api python test_deploy_e2e.py
```

**Opción B: Modificar el script**

Editar `test_deploy_e2e.py` línea 77 y pegar el JWT directamente:

```python
test_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Paso 6: Verificar el Resultado

Si todo está correcto, deberías ver:

```
✅ PASS — Health Check
✅ PASS — Supabase Connection
✅ PASS — Template Exists
✅ PASS — Deploy Endpoint

🎯 Total: 4/4 tests pasados

✅ TODOS LOS TESTS PASARON

🔗 Webhook URL: https://hooks.localhost/webhook/abc123
🆔 Workflow ID: 123
🆔 Agente ID: 550e8400-...
```

---

## Verificación del Workflow en n8n

Después de un deploy exitoso:

1. Abrir n8n UI (probablemente en `http://localhost:5678`)
2. Buscar el workflow con nombre "Ferretería El Martillo - Agente de Ventas"
3. Verificar que los placeholders fueron reemplazados:
   - `{{EMPRESA_NOMBRE}}` → "Ferretería El Martillo"
   - `{{NOMBRE_BOT}}` → "Marti-Bot"
4. Probar el webhook manualmente enviando un POST a la URL retornada

---

## Troubleshooting

### Error: "Cliente no encontrado"
- Verificar que el `supabase_user_id` en la tabla `clientes` coincide con el User UID de Supabase Auth

### Error: "Plantilla no encontrada"
- Verificar que existe el registro en la tabla `plantillas` con `ref_nombre = 'sales_v1'`
- Verificar que `activa = true`

### Error: "Créditos insuficientes"
- Verificar que `creditos_mensuales >= -10` en la tabla `clientes`

### Error al crear workflow en n8n
- Verificar que n8n está corriendo: `docker ps | grep n8n`
- Verificar que `N8N_API_KEY` está configurado correctamente en `.env`
- Ver logs: `docker logs codavity_api --tail 50`
