# REGLAS_CODIGO.md — Los Mandamientos de Codavity

> Para evitar que el crecimiento de Codavity se convierta en un caos técnico, el IDE debe seguir estas reglas estrictas.

---

## 1. Estilo Python

- **Type Hinting obligatorio:** Toda función debe declarar los tipos de sus parámetros y su retorno.
  ```python
  def crear_workflow(config: dict[str, Any]) -> dict[str, str]:
  ```
- **Manejo de errores centralizado:** No permitir que un fallo en n8n tumbe el script principal. Usar bloques `try/except` específicos con logging estructurado.
- **Logs estructurados:** Usar el módulo `logging` con formato JSON para facilitar la trazabilidad en producción.
- **Documentación:** Cada función debe incluir un docstring descriptivo con sección de `Args`, `Returns` y `Raises`.

---

## 2. Estandarización n8n

- **Nomenclatura de Nodos:** Todos los nodos deben seguir el formato:
  ```
  [Accion]_[Entidad]_[Detalle]
  ```
  Ejemplos:
  - `Set_Cliente_Config`
  - `HTTP_Webhook_Entrada`
  - `AI_Agent_Respuesta`
  - `DB_Guardar_Log`

- **Modularidad:** Los flujos deben ser legibles y estar comentados mediante notas internas en n8n.
- **Sin nodos huérfanos:** Todo nodo debe estar conectado y tener un propósito claro.

---

## 3. Seguridad

- **Variables de entorno:** Uso estricto de `os.environ` o `.env` (con `python-dotenv`) para cualquier credencial. **Nunca hardcodear tokens en el código.**
- **Encriptación básica:** Implementar encriptación para los tokens de clientes almacenados en la base de datos.
- **Principio de mínimo privilegio:** Las API Keys de n8n deben tener solo los permisos necesarios para las operaciones requeridas.
- **Validación de entrada:** Todo JSON recibido debe ser validado contra un esquema antes de ser procesado.
