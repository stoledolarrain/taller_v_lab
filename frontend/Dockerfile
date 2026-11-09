# Stage 1: Build de la SPA con Vite & React
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias exactas
RUN npm ci

# Copiar el código fuente del frontend
COPY . .

# Compilar los bundles de producción
RUN npm run build

# Stage 2: Servidor web ligero Nginx para producción
FROM nginx:alpine

# Limpiar archivos por defecto de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar los artefactos estáticos generados en la fase de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar la configuración del reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto estándar HTTP
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
