# Soluciones para el Problema de Rust en Windows

## Problema

Al intentar instalar las dependencias con `pip install -r requirements.txt`, la instalación falla porque `pydantic-core` requiere compilar componentes en Rust, y el usuario no tiene Rust instalado en su sistema Windows.

```
error: metadata-generation-failed
× Encountered error while generating package metadata.
╰─> See Above for output.

note: This package requires Rust and Cargo to compile extensions.
```

## Soluciones Disponibles

### Opción 1: Usar Docker (Recomendado para Producción)

**Ventaja:** No requiere instalar nada adicional en Windows. El Dockerfile ya está configurado con todas las dependencias.

**Pasos:**
1. Asegúrate de tener Docker Desktop instalado en Windows
2. Desde la raíz del proyecto:
   ```bash
   docker-compose up --build
   ```

Esto construirá las imágenes automáticamente con todas las dependencias ya compiladas dentro del contenedor Linux.

### Opción 2: Instalar Rust en Windows (Para desarrollo local)

**Ventaja:** Permite ejecutar el proyecto directamente en Windows sin Docker.

**Pasos:**
1. Descargar e instalar Rust desde: https://rustup.rs/
   - Para Windows: https://win.rustup.rs/x86_64
2. Reiniciar el terminal (para actualizar el PATH)
3. Ejecutar:
   ```bash
   cd api
   .venv\Scripts\pip.exe install -r requirements.txt
   ```

### Opción 3: Usar wheels pre-compilados de terceros (No recomendado)

Buscar en sitios como https://www.lfd.uci.edu/~gohlke/pythonlibs/ archivos `.whl` pre-compilados para pydantic-core compatible con Python 3.14 en Windows.

## Recomendación

Para este proyecto, **usa Docker Compose** (Opción 1). Es la estrategia que usaremos en producción de todas formas, y evita este tipo de problemas de dependencias específicas del sistema operativo.

Si prefieres desarrollar localmente sin Docker, instala Rust (Opción 2) — la instalación es sencilla y solo toma unos minutos.
