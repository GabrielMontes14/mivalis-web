# 🚀 Guía de Despliegue en Render

Sigue estos pasos para llevar tu tienda a internet usando Render.com.

## 1. Preparar GitHub
1. Asegúrate de que todos tus cambios estén subidos a GitHub (ya lo hicimos).
   - El archivo `render.yaml` debe estar en el repositorio.

## 2. Crear cuenta en Render
1. Ve a [dashboard.render.com](https://dashboard.render.com/)
2. Regístrate usando tu cuenta de **GitHub**.

## 3. Crear el Blueprint (Despliegue Automático)
1. En el dashboard de Render, haz clic en **"New +"** y selecciona **"Blueprint"**.
2. Conecta tu repositorio `Sitio-Web-Bodega-Mayorista`.
3. Render detectará automáticamente el archivo `render.yaml`.
4. Haz clic en **Apply** o **Create**.

## 4. Configurar Variables de Entorno
Render te pedirá valores para las variables que marcamos como privadas (`sync: false`). Deberás ingresar:

- **WOMPI_PUBLIC_KEY**: Tu llave pública de Wompi.
- **WOMPI_PRIVATE_KEY**: Tu llave privada de Wompi.
- **WOMPI_EVENT_SECRET**: Tu secreto de eventos Wompi.
- **MAIL_USERNAME**: Correo gmail para notificaciones.
- **MAIL_PASSWORD**: Contraseña de aplicación de gmail.

## 5. Base de Datos
- El Blueprint creará automáticamente una base de datos PostgreSQL gratuita.
- La variable `DATABASE_URL` se configurará sola mágicamente ✨.

## 6. Primer inicio (Migraciones)
Una vez que el servicio esté "Live" (verde), necesitaremos crear las tablas en la nueva base de datos.
Render tiene una consola "Shell" en el dashboard del servicio web.

1. Ve a tu servicio `bodega-mayorista-api` en Render.
2. Pestaña **Shell** > **Start Shell**.
3. Ejecuta este comando para crear las tablas:
   ```bash
   python -c "import asyncio; from app.database import engine, Base; asyncio.run(Base.metadata.create_all(bind=engine))"
   ```
4. (Opcional) Si quieres crear el usuario admin inicial:
   ```bash
   # Tendrías que tener un script para esto o insertarlo por SQL
   # O simplemente regístrate en la app si el registro está abierto
   ```

## 7. ¡Listo!
Render te dará una URL visible (ej. `https://bodega-mayorista-api.onrender.com`).
Esa será la nueva dirección de tu página.

---

## ⚠️ Nota sobre Archivos Subidos
El plan gratuito de Render **NO guarda archivos permanentemente** (las imágenes que subas se borran cuando el servidor se reinicia/apaga).
- Para producción real, se recomienda usar un servicio como AWS S3 o Cloudinary para las imágenes.
- Por ahora, funcionará, pero ten en cuenta esa limitación.
