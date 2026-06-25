## Builder
FROM node:26.4.0-alpine AS builder

WORKDIR /src

COPY package.json package-lock.json /src/
RUN npm ci
COPY . /src/
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm run build


## App
FROM nginx:1.29.8-alpine

LABEL org.opencontainers.image.title="Debilbi" \
  org.opencontainers.image.description="Matrix-powered voice and chat service" \
  org.opencontainers.image.source="https://github.com/Rulunchic/debilbi" \
  org.opencontainers.image.licenses="AGPL-3.0-only"

COPY --from=builder /src/dist /app
COPY --from=builder /src/docker-nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html \
  && ln -s /app /usr/share/nginx/html

RUN touch /usr/share/nginx/html/health

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

USER nginx
