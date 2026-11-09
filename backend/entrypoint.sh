#!/bin/sh
set -e

echo "=== [Pasanaku Digital] Iniciando contenedor del Backend ==="

# Si PostgreSQL está configurado, esperar hasta que acepte conexiones
if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
    echo "Esperando que la base de datos PostgreSQL ($DB_HOST:$DB_PORT) esté lista..."
    while ! python -c "import socket; s = socket.socket(); s.connect(('$DB_HOST', int('$DB_PORT'))); s.close()" 2>/dev/null; do
        sleep 1
    done
    echo "¡Base de datos PostgreSQL disponible y lista!"
fi

echo "Aplicando migraciones pendientes..."
python manage.py migrate --noinput

echo "Recolectando archivos estáticos..."
python manage.py collectstatic --noinput || true

echo "Servidor de Backend listo. Arrancando proceso principal..."
exec "$@"
