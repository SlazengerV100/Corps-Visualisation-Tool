FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

FROM node:24-bookworm-slim

RUN addgroup --system --gid 65532 app && \
    adduser --system --uid 65532 --ingroup app app

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src

USER app

EXPOSE 8081

CMD ["node", "src/server.js"]
