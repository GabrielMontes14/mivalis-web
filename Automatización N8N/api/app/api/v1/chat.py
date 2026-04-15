"""
Chat Proxy — Reenvía mensajes del dashboard a los webhooks de n8n.
Evita CORS: browser → FastAPI → n8n webhook
Incluye retry automático cuando n8n devuelve body vacío (AI Agent error).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import logging
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatProxyRequest(BaseModel):
    webhook_url: str
    telefono: str
    nombre: str = "Tester"
    mensaje: str


MAX_RETRIES = 2
RETRY_DELAY = 1.5


@router.post("/chat/proxy")
async def chat_proxy(body: ChatProxyRequest):
    """
    Proxy de chat: recibe un mensaje del dashboard y lo envía al webhook de n8n.
    Retorna la respuesta del bot directamente.
    Reintenta automáticamente si n8n devuelve body vacío (error interno del AI Agent).
    """
    payload = {
        "telefono": body.telefono,
        "nombre": body.nombre,
        "mensaje": body.mensaje,
    }

    logger.info("Chat proxy: reenviando a webhook",
                extra={"webhook_url": body.webhook_url, "telefono": body.telefono})

    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    body.webhook_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

            if not resp.is_success:
                logger.warning("Bot respondió con error",
                               extra={"status": resp.status_code, "body": resp.text[:200]})
                raise HTTPException(
                    status_code=502,
                    detail=f"El bot respondió con status {resp.status_code}: {resp.text[:200]}"
                )

            # Check for empty body (n8n returns 200 with empty body when AI Agent fails)
            body_text = resp.text.strip()
            if not body_text:
                logger.warning(f"Bot devolvió body vacío (intento {attempt}/{MAX_RETRIES})",
                               extra={"attempt": attempt})
                last_error = "El bot devolvió una respuesta vacía. El modelo de IA puede estar temporalmente saturado."
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_DELAY)
                    continue
                else:
                    # After retries, return a clear error
                    return {
                        "response": "",
                        "error": last_error,
                    }

            # Parse response
            try:
                data = resp.json()
            except Exception:
                data = {"response": body_text}

            # Validate response has content
            response_text = data.get("response", "") if isinstance(data, dict) else ""
            if not response_text and isinstance(data, dict):
                logger.warning(f"Bot respondió con response vacío (intento {attempt}/{MAX_RETRIES})")
                last_error = "El modelo de IA generó una respuesta vacía. Intenta con otro mensaje."
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_DELAY)
                    continue
                else:
                    return {
                        "response": "",
                        "error": last_error,
                    }

            logger.info("Chat proxy: respuesta recibida",
                        extra={"status": resp.status_code, "attempt": attempt})
            return data

        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="El bot tardó demasiado en responder (timeout 60s)")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"No se pudo conectar al webhook: {str(e)}")
        except HTTPException:
            raise

    # Should not reach here, but just in case
    return {"response": "", "error": last_error or "Error desconocido"}
