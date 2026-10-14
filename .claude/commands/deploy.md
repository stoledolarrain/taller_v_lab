---
description: Procedimiento de despliegue para el proyecto Pasanaku Digital.
---

# /deploy — Instrucciones de Despliegue

1. **Backend:**
   - Asegurar que las variables de entorno de producción estén configuradas (`DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `ALLOWED_HOSTS`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`).
   - Ejecutar recolección de estáticos: `python manage.py collectstatic --noinput`.
   - Ejecutar migraciones en la base de datos de producción: `python manage.py migrate`.
   - Levantar servidor con Gunicorn o Uvicorn (`config.wsgi:application` o `config.asgi:application`).

2. **Frontend:**
   - Construir el bundle estático optimizado: `npm run build`.
   - Servir el directorio `dist/` a través de NGINX, Cloudflare Pages o el servidor estático elegido.
