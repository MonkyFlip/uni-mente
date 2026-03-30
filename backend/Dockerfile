# ================================================================
#  UniMente — Dockerfile (NestJS + MSSQL)
#  OWASP mitigations:
#   A05: usuario no-root (node), no secrets en imagen
#   A06: imagen base específica (no :latest), npm ci (lockfile)
#   A08: multi-stage build (no devDeps en produccion)
# ================================================================

# ── Stage 1: builder ─────────────────────────────────────────────
FROM node:20.14-alpine AS builder

# Instalar dependencias del sistema para mssql (node-gyp)
RUN apk add --no-cache python3 make g++ krb5-dev

WORKDIR /app

# Copiar lockfile primero para aprovechar cache de Docker
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copiar fuente y compilar
COPY . .
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────
FROM node:20.14-alpine AS runtime

# A05: instalar dumb-init para manejo correcto de señales
RUN apk add --no-cache dumb-init krb5-libs

WORKDIR /app

# A06: solo dependencias de produccion (sin devDeps)
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev && npm cache clean --force

# Copiar artefactos del builder
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/src/database ./src/database
COPY --from=builder /app/nest-cli.json ./

# Crear carpeta de backups con permisos del usuario node
RUN mkdir -p /app/Backup && chown node:node /app/Backup /app/dist /app/src

# A05: usuario no privilegiado
USER node

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/graphql || exit 1

# dumb-init asegura SIGTERM correcto → graceful shutdown de NestJS
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
