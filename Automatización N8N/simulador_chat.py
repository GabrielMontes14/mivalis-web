import urllib.request
import urllib.error
import json
import time

# Variables de Configuración
WEBHOOK_URL = "http://localhost:5678/webhook/agent-dfd19ad9-5ca4-4db4-a48a-aa7a178e13aa"
BOT_NAME = "FixBot4"

def send_message(mensaje, telefono="573001234567", nombre="Lead Demo"):
    data = {
        "telefono": telefono,
        "mensaje": mensaje,
        "nombre": nombre
    }
    encoded_data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(WEBHOOK_URL, data=encoded_data)
    req.add_header('Content-Type', 'application/json')
    req.add_header('User-Agent', 'Oceanman-Simulator/1.0')

    try:
        response = urllib.request.urlopen(req, timeout=30)
        resp_data = response.read().decode('utf-8')
        try:
            # Si el bot responde con JSON
            parsed = json.loads(resp_data)
            return parsed
        except:
            return resp_data
    except urllib.error.URLError as e:
        return f"Error de conexión: {e.reason} (¿Está n8n y el agente encendidos?)"
    except Exception as e:
        return f"Error inesperado: {str(e)}"

def start_sim():
    print("=" * 60)
    print(f"🤖 OCEANMAN CHAT SIMULATOR (Conectado a: {BOT_NAME})")
    print("=" * 60)
    print("Estás simulando ser un cliente chateando desde WhatsApp.")
    print("Tus mensajes serán enviados directamente al cerebro de la IA.")
    print("Escribe 'salir' para cerrar la prueba.\n")
    
    telefono_simulado = input("Introduce un número de teléfono de prueba (ej: 573210001234): ").strip()
    if not telefono_simulado:
        telefono_simulado = "573210009999"
        
    nombre_simulado = input("Tu nombre de prueba (ej: TestLead): ").strip()
    if not nombre_simulado:
        nombre_simulado = "TestLead"

    print("\n--- CHAT INICIADO ---")
    
    while True:
        try:
            msg = input(f"\n[{nombre_simulado}]: ")
            if msg.lower() in ('salir', 'exit', 'quit'):
                print("Cerrando simulador...")
                break
            
            if not msg.strip():
                continue
                
            print(f"[{BOT_NAME} está escribiendo...]")
            
            # Enviar request
            start_time = time.time()
            respuesta = send_message(msg, telefono=telefono_simulado, nombre=nombre_simulado)
            end_time = time.time()
            
            # Formatear respuesta
            if isinstance(respuesta, list) and len(respuesta) > 0 and isinstance(respuesta[0], dict) and 'response' in respuesta[0]:
                 # n8n webhook might return [{"response":"..."}]
                 texto_bot = respuesta[0].get('response', str(respuesta))
                 print(f"\n🤖 [{BOT_NAME}] ({round(end_time - start_time, 1)}s): {texto_bot}")
            elif isinstance(respuesta, dict):
                 print(f"\n🤖 [{BOT_NAME}] ({round(end_time - start_time, 1)}s): {json.dumps(respuesta, indent=2, ensure_ascii=False)}")
            else:
                 print(f"\n🤖 [{BOT_NAME}] ({round(end_time - start_time, 1)}s): {respuesta}")

        except KeyboardInterrupt:
            print("\nCerrando simulador...")
            break

if __name__ == "__main__":
    start_sim()
