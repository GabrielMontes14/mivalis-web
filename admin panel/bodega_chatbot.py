import os
import sys

# Simulación de la respuesta de una IA (Placeholder) o uso de API real.
# Para usar esto con una IA real (como GPT), necesitarías instalar 'openai' y configurar tu API KEY.
# pip install openai

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

class BodegaBot:
    def __init__(self, api_key=None):
        self.api_key = api_key
        
        # EL SYSTEM PROMPT (Tu configuración maestra)
        self.system_prompt = """Eres un chatbot de atención al cliente para una Bodega Mayorista en Instagram. Antes de responder, revisa si la consulta es clara; si no lo es, pide amablemente que la repitan y no inventes información. Responde siempre con mensajes muy breves, claros y profesionales, usando un tono cercano y emojis con moderación (📦📍🕒📲). Si preguntan por precios o catálogos, no muestres listas ni valores en público y dirige la conversación a DM o WhatsApp para cotización. Si preguntan por horarios, informa que la atención es de lunes a sábado de 7:00 a.m. a 6:00 p.m. Si preguntan por ubicación, indica Av. Principal #123, Zona Industrial, frente al Mercado Central. Prioriza siempre llevar la conversación a DM o WhatsApp para continuar la atención y cerrar la venta. Si ocurre un error, duda o información faltante, responde de forma educada solicitando más detalles en lugar de asumir."""
        
        if HAS_OPENAI and api_key:
            self.client = OpenAI(api_key=api_key)
        else:
            print("⚠️ AVISO: No se detectó librería 'openai' o API Key.")
            print("   -> Funcionando en modo SIMULACIÓN (Respuestas predefinidas básicas).")

    def responder(self, mensaje_usuario):
        """
        Genera una respuesta basada en el mensaje del usuario.
        """
        if HAS_OPENAI and self.api_key:
            return self._consultar_ia_real(mensaje_usuario)
        else:
            return self._simular_ia_basica(mensaje_usuario)

    def _consultar_ia_real(self, mensaje):
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo", # O el modelo que prefieras
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": mensaje}
                ],
                temperature=0.7,
                max_tokens=150
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error de conexión con la IA: {e}"

    def _simular_ia_basica(self, mensaje):
        """
        Lógica simple para probar sin gastar en API.
        Actualizada para coincidir con tu nuevo tono de marca.
        """
        msg = mensaje.lower()
        
        # 1. Precios o Catálogo
        if any(x in msg for x in ["precio", "cuesta", "catalogo", "catálogo", "lista"]):
            return "¡Hola! 👋 Para precios y catálogo mayorista, por favor escríbenos al DM o WhatsApp: [LINK]. ¡Te cotizamos al instante! 📲"
        
        # 2. Horarios
        elif any(x in msg for x in ["hora", "abren", "cierran", "horario"]):
            return "¡Hola! 🕒 Atendemos de Lunes a Sábado de 7:00 AM a 6:00 PM."
            
        # 3. Ubicación
        elif any(x in msg for x in ["ubicacion", "ubicación", "donde", "dirección", "direccion"]):
            return "Estamos en Av. Principal #123, Zona Industrial (frente al Mercado Central) 📍."
            
        # 4. Envíos (Extra)
        elif any(x in msg for x in ["envio", "delivery", "domicilio"]):
             return "¡Sí, hacemos envíos! 🚚 Escríbenos al WhatsApp [LINK] para coordinar tu pedido."

        # Default: No entendí
        else:
            return "Disculpa, no entendí bien tu consulta. 🤔 ¿Podrías repetirla con más detalles? Estoy aquí para ayudarte."

# --- BLOQUE DE PRUEBA ---
if __name__ == "__main__":
    # Puedes poner tu API Key real aquí o en las variables de entorno:
    api_key_env = os.getenv("OPENAI_API_KEY") 
    # mi_bot = BodegaBot(api_key="sk-...") 
    
    print("--- INICIANDO BODEGA BOT ---")
    if api_key_env:
        print("✅ API Key detectada en variables de entorno.")
        mi_bot = BodegaBot(api_key=api_key_env)
    else:
        mi_bot = BodegaBot() # Sin key usa el modo simulación
    
    print("\n(Escribe 'salir' para terminar)\n")
    
    while True:
        user_input = input("Tú: ")
        if user_input.lower() in ["salir", "exit"]:
            break
            
        respuesta = mi_bot.responder(user_input)
        print(f"Bot: {respuesta}\n")