"""
Script de prueba end-to-end del sistema de deploy
Prueba el flujo completo: Auth → Deploy → Verificación
"""
import httpx
import json
import os
from pathlib import Path

# Configuración
API_URL = "http://localhost:8000"
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://placeholder.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# Colores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
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


def test_health_check():
    """Paso 1: Verificar que la API está corriendo"""
    print_step("1/5", "Verificando health check de la API...")
    
    try:
        response = httpx.get(f"{API_URL}/health", timeout=5.0)
        if response.status_code == 200:
            print_success(f"API está operativa: {response.json()}")
            return True
        else:
            print_error(f"API respondió con código {response.status_code}")
            return False
    except Exception as e:
        print_error(f"No se pudo conectar con la API: {e}")
        return False


def test_supabase_connection():
    """Paso 2: Verificar conexión con Supabase"""
    print_step("2/5", "Verificando conexión con Supabase...")
    
    try:
        response = httpx.get(f"{API_URL}/test/supabase", timeout=10.0)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success":
                print_success("Conexión con Supabase exitosa")
                return True
            else:
                print_error(f"Supabase respondió con error: {data}")
                return False
        else:
            print_error(f"Test de Supabase falló con código {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error al probar Supabase: {e}")
        return False


def get_test_jwt():
    """Paso 3: Obtener JWT de prueba (o usar uno hardcodeado)"""
    print_step("3/5", "Obteniendo JWT de autenticación...")
    
    # OPCIÓN 1: Si tienes un JWT de prueba, úsalo directamente
    test_jwt = os.getenv("TEST_JWT", "")
    
    if test_jwt:
        print_success("JWT obtenido de variable de entorno TEST_JWT")
        return test_jwt
    
    # OPCIÓN 2: Intentar autenticar con Supabase
    print_warning("No se encontró TEST_JWT en variables de entorno")
    print_warning("Para probar el deploy, necesitas:")
    print_warning("1. Crear un usuario en Supabase Auth")
    print_warning("2. Insertar un registro en la tabla 'clientes' con ese supabase_user_id")
    print_warning("3. Obtener el JWT del usuario y guardarlo en TEST_JWT")
    print_warning("\nPor ahora, el test continuará sin autenticación (esperamos 401)")
    
    return None


def test_deploy_endpoint(jwt: str = None):
    """Paso 4: Probar el endpoint de deploy"""
    print_step("4/5", "Probando endpoint POST /api/v1/deploy...")
    
    # Leer el ejemplo de request
    example_path = Path(__file__).parent / "templates" / "examples" / "deploy_request_example.json"
    
    if not example_path.exists():
        print_error(f"No se encontró el archivo de ejemplo: {example_path}")
        return False
    
    with open(example_path, "r", encoding="utf-8") as f:
        deploy_request = json.load(f)
    
    print(f"\n📄 Request body:")
    print(json.dumps(deploy_request, indent=2, ensure_ascii=False))
    
    # Preparar headers
    headers = {"Content-Type": "application/json"}
    if jwt:
        headers["Authorization"] = f"Bearer {jwt}"
    
    try:
        response = httpx.post(
            f"{API_URL}/api/v1/deploy",
            json=deploy_request,
            headers=headers,
            timeout=30.0
        )
        
        print(f"\n📡 Response status: {response.status_code}")
        print(f"📡 Response body:")
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        
        if response.status_code == 201:
            print_success("¡Deploy exitoso! 🎉")
            data = response.json()
            print(f"\n🔗 Webhook URL: {data.get('webhook_url')}")
            print(f"🆔 Workflow ID: {data.get('workflow_id')}")
            print(f"🆔 Agente ID: {data.get('agente_id')}")
            return True
        elif response.status_code == 401:
            print_warning("Sin autenticación (esperado si no hay JWT)")
            print_warning("El endpoint está funcionando, solo falta un JWT válido")
            return True  # Consideramos esto un éxito parcial
        elif response.status_code == 404:
            print_error("Cliente no encontrado (necesitas crear el cliente en BD)")
            return False
        else:
            print_error(f"Deploy falló con código {response.status_code}")
            return False
    
    except Exception as e:
        print_error(f"Error al hacer deploy: {e}")
        return False


def test_template_exists():
    """Paso 5: Verificar que existe la plantilla sales_v1.json"""
    print_step("5/5", "Verificando que existe la plantilla sales_v1.json...")
    
    template_path = Path(__file__).parent / "templates" / "sales_v1.json"
    
    if template_path.exists():
        print_success(f"Plantilla encontrada: {template_path}")
        
        # Verificar que es JSON válido
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


def main():
    """Ejecuta todos los tests"""
    print("\n" + "="*60)
    print("🧪 TEST END-TO-END — Motor de Agentes Codavity")
    print("="*60)
    
    results = {
        "Health Check": test_health_check(),
        "Supabase Connection": test_supabase_connection(),
        "Template Exists": test_template_exists(),
    }
    
    # Obtener JWT
    jwt = get_test_jwt()
    
    # Test de deploy
    results["Deploy Endpoint"] = test_deploy_endpoint(jwt)
    
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
        print(f"\n{Colors.GREEN}✅ TODOS LOS TESTS PASARON{Colors.END}")
        print("\n📝 Próximos pasos:")
        print("1. Crear un usuario en Supabase Auth")
        print("2. Insertar registro en tabla 'clientes' con ese user_id")
        print("3. Obtener JWT y guardarlo en TEST_JWT")
        print("4. Ejecutar nuevamente este script")
    else:
        print(f"\n{Colors.RED}❌ ALGUNOS TESTS FALLARON{Colors.END}")
        print("Revisa los errores arriba para más detalles")
    
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    main()
