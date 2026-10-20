FROM node:24-bookworm-slim AS frontend

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM node:24-bookworm-slim AS backend

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/src ./src

FROM node:24-bookworm-slim

RUN addgroup --system --gid 65532 app && \
    adduser --system --uid 65532 --ingroup app app

WORKDIR /app

COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/package.json ./package.json
COPY --from=backend /app/src ./src
COPY --from=frontend /app/dist ./public

ENV STATIC_FOLDER=/app/public

USER app

EXPOSE 8080

CMD ["node", "src/server.js"]
