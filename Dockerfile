# Dockerfile
FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends rsync \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN npm install --include=dev && npm install -g .

LABEL org.opencontainers.image.source="https://github.com/doguabaris/expo-squircle"
LABEL org.opencontainers.image.description="Expo squircle background component"
LABEL org.opencontainers.image.licenses="MIT"

ENTRYPOINT ["expo-squircle"]
