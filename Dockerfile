# Stage 1: Build Frontend PWA
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Backend API
FROM node:24-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Production Runtime
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/engbook.db
ENV STATIC_DIR=/app/public

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ./public

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3001

CMD ["node", "dist/index.js"]
