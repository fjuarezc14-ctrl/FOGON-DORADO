# Imagen de producción del backend: el código va dentro de la imagen (sin carpeta montada).
# Para desarrollo con recarga del código: docker-compose.dev.yml usa Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

# Dependencias del sistema para Prisma
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3000

# Al iniciar: aplicar las migraciones pendientes y arrancar el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
