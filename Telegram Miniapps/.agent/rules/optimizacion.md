---
trigger: always_on
---

## ⚙️ ESTÁNDARES TÉCNICOS Y PERFORMANCE (Add-on)
### 1. 📉 Assets & Media Diet
*   **Regla "Peso Pluma":** Ningún asset estático debe pesar >100KB.
*   **Formatos:** Usa EXCLUSIVAMENTE **WebP** para imágenes y **SVG** para iconos/ilustraciones.
*   **Lazy Loading:** Implementa `loading="lazy"` o virtualización en cualquier lista que pueda crecer.
### 2. 🤖 Integración de AI (Si aplica)
*   **Latencia Percibida:** Si usamos AI para generar rutinas/consejos, NUNCA hagas esperar al usuario con un spinner estático. Usa "Streaming UI" (el texto aparece letra por letra) o "Skeleton Loaders" animados.
### 3. 🏗️ Design System as Code
*   **No Magic values:** Prohibido usar estilos arbitrarios (ej: `h-[53px]`). Define todo en `tailwind.config.js`.
*   **Consistencia:** Si cambias un color, cámbialo en el token global, no en el archivo.
### 4. ☁️ Infraestructura
*   **Enfoque Serverless:** Para la V1, usa Supabase Cloud para Auth/DB. Evita configurar Docker manualmente para la base de datos a menos que sea para un servicio de AI customizado en Python.