FROM python:3.12-slim-bookworm

# Evita que Python escriba archivos .pyc y habilita unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias de Python (psycopg2-binary provee binarios precompilados)
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente del backend
COPY . /app/

# Exponer el puerto por defecto de Django / Gunicorn
EXPOSE 8000

# Configurar el script de entrada (normalizando saltos de línea LF)
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--ws", "websockets"]
