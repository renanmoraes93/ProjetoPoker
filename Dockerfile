# Multi-stage build para otimizar o tamanho da imagem

# Stage 1: Build do Frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/client

# Copiar package.json e package-lock.json do frontend
COPY client/package*.json ./
RUN npm install --only=production

# Copiar código fonte do frontend
COPY client/ ./

# Build do frontend
RUN npm run build

# Stage 2: Setup do Backend
FROM node:18-alpine AS backend-setup
WORKDIR /app/server

# Copiar package.json e package-lock.json do backend
COPY server/package*.json ./
RUN npm install --only=production

# Copiar código fonte do backend
COPY server/ ./

# Stage 3: Imagem final
FROM node:18-alpine AS production

# Instalar dependências do sistema
RUN apk add --no-cache sqlite

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copiar backend do stage anterior
COPY --from=backend-setup --chown=nodejs:nodejs /app/server ./server

# Copiar build do frontend para ser servido pelo backend
COPY --from=frontend-build --chown=nodejs:nodejs /app/client/build ./client/build

# Criar diretório para o banco de dados
RUN mkdir -p /app/server/data && chown nodejs:nodejs /app/server/data

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 5000

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=5000

# Comando de inicialização
WORKDIR /app/server
CMD ["sh", "-c", "node scripts/initDatabase.js && node index.js"]