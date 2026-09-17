FROM node:24-bookworm-slim AS builder

ARG VITE_SERVER_URL=http://localhost:8081
ENV VITE_SERVER_URL=$VITE_SERVER_URL

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

RUN addgroup -g 65532 app && \
    adduser -D -u 65532 -G app app && \
    sed -i '/user  nginx;/d' /etc/nginx/nginx.conf && \
    touch /var/run/nginx.pid && \
    chown -R app:app /var/cache/nginx /var/run/nginx.pid /usr/share/nginx/html /etc/nginx/conf.d

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

USER app

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
