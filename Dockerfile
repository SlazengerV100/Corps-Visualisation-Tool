FROM node:24-bookworm-slim AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --workspace frontend

COPY tsconfig.base.json ./
COPY frontend ./frontend
RUN npm run build --workspace frontend

FROM node:24-bookworm-slim AS backend

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --workspace backend --omit=dev

COPY backend/src ./backend/src

FROM node:24-bookworm-slim

RUN addgroup --system --gid 65532 app && \
    adduser --system --uid 65532 --ingroup app app

WORKDIR /app

COPY --from=backend /app/node_modules ./node_modules
COPY --from=backend /app/backend ./backend
COPY --from=frontend /app/frontend/dist ./public

ENV STATIC_FOLDER=/app/public

USER app

EXPOSE 8080

CMD ["node", "backend/src/server.js"]
