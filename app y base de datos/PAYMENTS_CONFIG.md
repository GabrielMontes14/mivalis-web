# Configuración de Pagos - Bodega Mayorista

## 🔧 Configuración Inicial

### 1. Wompi (Pagos con Tarjeta y Nequi)

#### Registro en Wompi
1. Ve a [wompi.co/registro](https://commerceservi.co)
2. Crea tu cuenta de negocio
3. Completa verificación (1-2 días hábiles)
4. Obtén tus llaves API

#### Configura las Variables de Entorno (.env)

```bash
# Para pruebas (Sandbox)
WOMPI_PUBLIC_KEY=pub_test_XXXXXXXXXXXXXXXXX
WOMPI_PRIVATE_KEY=prv_test_XXXXXXXXXXXXXXXXX
WOMPI_EVENT_SECRET=XXXXXXXXXXXXXXXXX
WOMPI_ENV=test

# Para producción (cuando estés listo)
WOMPI_PUBLIC_KEY=pub_prod_XXXXXXXXXXXXXXXXX
WOMPI_PRIVATE_KEY=prv_prod_XXXXXXXXXXXXXXXXX
WOMPI_EVENT_SECRET=XXXXXXXXXXXXXXXXX
WOMPI_ENV=production
```

#### Configura Webhooks en Wompi
1. En tu cuenta de Wompi, ve a "Webhooks"
2. Agrega la URL: `https://tudominio.com/api/payments/webhook/wompi`
3. Selecciona el evento: `transaction.updated`
4. Guarda el `EVENT_SECRET` en tu `.env`

---

### 2. Transferencia Bancolombia (Manual)

Completa los datos de tu cuenta en `.env`:

```bash
BANK_ACCOUNT_NUMBER=1234567890
BANK_ACCOUNT_TYPE=Ahorros
BANK_ACCOUNT_HOLDER=Nombre del Titular
BANK_ACCOUNT_ID=1234567890
```

Estos datos se mostrarán automáticamente a los clientes que seleccionen "Transferencia Bancolombia".

---

## 📋 Flujos de Pago

### Tarjeta / Nequi (Automático con Wompi)

1. Cliente selecciona método de pago
2. Wompi procesa el pago
3. Sistema recibe webhook de confirmación
4. Pedido se marca como "confirmado" automáticamente

### Transferencia Bancolombia (Manual)

1. Cliente selecciona "Transferencia Bancolombia"
2. Ve los datos de tu cuenta bancaria
3. Realiza la transferencia
4. Sube comprobante de pago
5. **Tú verificas el pago en el panel admin**
6. Confirmas o rechazas el pedido

---

## 🛠️ Gestión de Pagos (Panel Admin)

### Ver Pagos Pendientes
```http
GET /api/payments/pending
```

### Verificar Pago Manual
```http
POST /api/payments/verify
{
  "payment_id": 123,
  "verified": true,
  "admin_notes": "Transferencia confirmada - Ref: ABC123"
}
```

---

## ✅ Testing

### Modo Sandbox (Wompi)

Tarjetas de prueba:
- **Aprobada**: `4242 4242 4242 4242`
- **Rechazada**: `4111 1111 1111 1111`
- CVV: `123`
- Fecha: Cualquier fecha futura

### Test Manual Transfer
1. Crea un pedido
2. Selecciona "Transferencia Bancolombia"
3. Sube cualquier imagen como comprobante
4. Verifica en panel admin (`/api/payments/pending`)

---

## 📊 Estados de Pago

| Estado | Descripción |
|--------|-------------|
| `pending` | Esperando verificación/pago |
| `approved` | Pago aprobado |
| `rejected` | Pago rechazado |
| `failed` | Error en transacción |

---

## 🔄 Recargar Backend

Después de configurar las variables de entorno, reinicia el contenedor:

```bash
docker-compose restart api
```

---

## 📞 Soporte

- Wompi: [soporte@wompi.co](mailto:soporte@wompi.co)
- Documentación: [docs.wompi.co](https://docs.wompi.co)
