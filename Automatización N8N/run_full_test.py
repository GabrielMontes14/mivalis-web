"""
Script automatizado para ejecutar el test end-to-end completo
Incluye: Login en Supabase + Setup de datos + Test de deploy
"""
import httpx
import json
import os
from pathlib import Path
from supabase import create_client, Client

# Configuración
API_URL = "http://localhost:8000"
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", SUPABASE_SERVICE_KEY)  # Fallback

# Credenciales de prueba
TEST_EMAIL = "test@codavity.com"
TEST_PASSWORD = "admin123"

# Colores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'

def print_step(step: str, message: str):
    """Imprime un paso del test"""
    print(f"\n{Colors.BLUE}[{step}]{Colors.END} {message}")

def print_success(message: str):
    """Imprime mensaje de éxito"""
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def print_error(message: str):
    """Imprime mensaje de error"""
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def print_warning(message: str):
    """Imprime mensaje de advertencia"""
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")

def print_info(message: str):
    """Imprime mensaje informativo"""
    print(f"{Colors.CYAN}ℹ {message}{Colors.END}")


def setup_test_data(supabase: Client, user_id: str):
    """
    Configura los datos de prueba en Supabase
    - Inserta cliente si no existe
    - Inserta plantilla si no existe
    """
    print_step("SETUP", "Configurando datos de prueba en Supabase...")
    
    # 1. Verificar si existe el cliente
    try:
        response = supabase.table("clientes").select("*").eq("supabase_user_id", user_id).execute()
        
        if response.data and len(response.data) > 0:
            print_success(f"Cliente ya existe: {response.data[0]['empresa_nombre']}")
            cliente_id = response.data[0]['id']
        else:
            # Crear cliente
            print_info("Creando cliente de prueba...")
            cliente_data = {
                "empresa_nombre": "Ferretería El Martillo",
                "email": TEST_EMAIL,
                "plan": "profesional",
                "estado": "activo",
                "creditos_mensuales": 500,
                "creditos_plan_base": 500,
                "supabase_user_id": user_id
            }
            response = supabase.table("clientes").insert(cliente_data).execute()
            cliente_id = response.data[0]['id']
            print_success(f"Cliente creado: {cliente_id}")
    
    except Exception as e:
        print_error(f"Error al configurar cliente: {e}")
        return False
    
    # 2. Verificar si existe la plantilla
    try:
        response = supabase.table("plantillas").select("*").eq("ref_nombre", "sales_v1").execute()
        
        if response.data and len(response.data) > 0:
            print_success(f"Plantilla ya existe: sales_v1 (v{response.data[0]['version']})")
        else:
            # Crear plantilla
            print_info("Creando plantilla sales_v1...")
            plantilla_data = {
                "ref_nombre": "sales_v1",
                "descripcion": "Agente de Ventas y Agendamiento - Placeholder",
                "version": 1,
                "archivo_json": "sales_v1.json",
                "variables_requeridas": ["empresa_nombre", "nombre_bot", "descripcion_negocio", "lista_productos", "objetivo_conversion", "link_agenda", "prompt_sistema"],
                "activa": True
            }
            response = supabase.table("plantillas").insert(plantilla_data).execute()
            print_success("Plantilla sales_v1 creada")
    
    except Exception as e:
        print_error(f"Error al configurar plantilla: {e}")
        return False
    
    return True


def login_and_get_jwt():
    """
    Hace login en Supabase y obtiene el JWT
    """
    print_step("1/5", "Autenticando en Supabase...")
    
    try:
        # Crear cliente con Anon Key (para autenticación de usuarios)
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # Intentar login
        response = supabase.auth.sign_in_with_password({
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.session and response.session.access_token:
            jwt = response.session.access_token
            user_id = response.user.id
            print_success(f"Login exitoso - User ID: {user_id}")
            print_info(f"JWT obtenido (primeros 50 chars): {jwt[:50]}...")
            
            # Setup de datos con Service Key
            supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
            if not setup_test_data(supabase_admin, user_id):
                print_error("Falló el setup de datos")
                return None
            
            return jwt
        else:
            print_error("No se pudo obtener el JWT de la sesión")
            return None
    
    except Exception as e:
        print_error(f"Error al autenticar: {e}")
        print_warning("Asegúrate de que el usuario test@codavity.com existe en Supabase Auth")
        print_warning("Puedes crearlo desde: Supabase Dashboard → Authentication → Users")
        return None


def test_health_check():
    """Paso 2: Verificar que la API está corriendo"""
    print_step("2/5", "Verificando health check de la API...")
    
    try:
        response = httpx.get(f"{API_URL}/health", timeout=5.0)
        if response.status_code == 200:
            print_success(f"API está operativa")
            return True
        else:
            print_error(f"API respondió con código {response.status_code}")
            return False
    except Exception as e:
        print_error(f"No se pudo conectar con la API: {e}")
        return False


def test_supabase_connection():
    """Paso 3: Verificar conexión con Supabase"""
    print_step("3/5", "Verificando conexión con Supabase...")
    
    try:
        response = httpx.get(f"{API_URL}/test/supabase", timeout=10.0)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success":
                print_success("Conexión con Supabase exitosa")
                return True
        print_error("Test de Supabase falló")
        return False
    except Exception as e:
        print_error(f"Error al probar Supabase: {e}")
        return False


def test_template_exists():
    """Paso 4: Verificar que existe la plantilla sales_v1.json"""
    print_step("4/5", "Verificando que existe la plantilla sales_v1.json...")
    
    template_path = Path("/app/templates/sales_v1.json")
    
    if template_path.exists():
        print_success(f"Plantilla encontrada")
        try:
            with open(template_path, "r", encoding="utf-8") as f:
                workflow = json.load(f)
            print_success(f"JSON válido con {len(workflow.get('nodes', []))} nodos")
            return True
        except json.JSONDecodeError as e:
            print_error(f"JSON inválido: {e}")
            return False
    else:
        print_error(f"Plantilla no encontrada: {template_path}")
        return False


def test_deploy_endpoint(jwt: str):
    """Paso 5: Probar el endpoint de deploy con JWT"""
    print_step("5/5", "Probando endpoint POST /api/v1/deploy con JWT...")
    
    # Leer el ejemplo de request
    example_path = Path("/app/templates/examples/deploy_request_example.json")
    
    if not example_path.exists():
        print_error(f"No se encontró el archivo de ejemplo")
        return False
    
    with open(example_path, "r", encoding="utf-8") as f:
        deploy_request = json.load(f)
    
    print_info(f"Plantilla: {deploy_request['plantilla_ref']}")
    print_info(f"Empresa: {deploy_request['config_personalizada']['empresa_nombre']}")
    
    # Preparar headers con JWT
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {jwt}"
    }
    
    try:
        response = httpx.post(
            f"{API_URL}/api/v1/deploy",
            json=deploy_request,
            headers=headers,
            timeout=30.0
        )
        
        print(f"\n📡 Response status: {response.status_code}")
        
        response_data = response.json()
        print(f"📡 Response body:")
        print(json.dumps(response_data, indent=2, ensure_ascii=False))
        
        if response.status_code == 201:
            print_success("¡Deploy exitoso! 🎉")
            print(f"\n{Colors.CYAN}═══════════════════════════════════════{Colors.END}")
            print(f"{Colors.GREEN}🔗 Webhook URL:{Colors.END} {response_data.get('webhook_url')}")
            print(f"{Colors.GREEN}🆔 Workflow ID:{Colors.END} {response_data.get('workflow_id')}")
            print(f"{Colors.GREEN}🆔 Agente ID:{Colors.END} {response_data.get('agente_id')}")
            print(f"{Colors.CYAN}═══════════════════════════════════════{Colors.END}\n")
            return True
        else:
            print_error(f"Deploy falló con código {response.status_code}")
            return False
    
    except Exception as e:
        print_error(f"Error al hacer deploy: {e}")
        return False


def main():
    """Ejecuta el test completo"""
    print("\n" + "="*60)
    print("🧪 TEST END-TO-END COMPLETO — Motor de Agentes Codavity")
    print("="*60)
    
    # Paso 1: Login y obtener JWT
    jwt = login_and_get_jwt()
    if not jwt:
        print(f"\n{Colors.RED}❌ No se pudo obtener JWT. Test abortado.{Colors.END}\n")
        return
    
    # Ejecutar tests
    results = {
        "Health Check": test_health_check(),
        "Supabase Connection": test_supabase_connection(),
        "Template Exists": test_template_exists(),
        "Deploy Endpoint": test_deploy_endpoint(jwt),
    }
    
    # Resumen
    print("\n" + "="*60)
    print("📊 RESUMEN DE RESULTADOS")
    print("="*60)
    
    for test_name, passed in results.items():
        status = f"{Colors.GREEN}✓ PASS{Colors.END}" if passed else f"{Colors.RED}✗ FAIL{Colors.END}"
        print(f"{status} — {test_name}")
    
    total_passed = sum(results.values())
    total_tests = len(results)
    
    print(f"\n🎯 Total: {total_passed}/{total_tests} tests pasados")
    
    if total_passed == total_tests:
        print(f"\n{Colors.GREEN}{'='*60}{Colors.END}")
        print(f"{Colors.GREEN}✅ ¡TODOS LOS TESTS PASARON! 🎉{Colors.END}")
        print(f"{Colors.GREEN}{'='*60}{Colors.END}")
        print("\n📝 Próximos pasos:")
        print("1. Abrir n8n UI y verificar el workflow creado")
        print("2. Probar el webhook manualmente")
        print("3. Diseñar el workflow completo con AI Agent + Supabase")
    else:
        print(f"\n{Colors.RED}❌ ALGUNOS TESTS FALLARON{Colors.END}")
        print("Revisa los errores arriba para más detalles")
    
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    main()
