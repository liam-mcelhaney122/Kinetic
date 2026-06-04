# syntax=docker/dockerfile:1.7
# Multi-stage build for the Kinetic frontend.
# Build context: frontend/ directory
#   docker build -f frontend/Dockerfile -t kinetic-frontend frontend/
# Or via Fly: fly deploy --config frontend/fly.toml

# ---------- Builder ----------
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Normalize nginx.conf location — works whether context is frontend/ or repo root
RUN if [ -f nginx.conf ]; then cp nginx.conf /tmp/nginx.conf; \
    elif [ -f frontend/nginx.conf ]; then cp frontend/nginx.conf /tmp/nginx.conf; \
    else echo "nginx.conf not found" && exit 1; fi

# VITE_* vars must be present at build time — they get inlined into the JS bundle.
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

RUN npm run build

# ---------- Runtime ----------
FROM nginx:1.27-alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /tmp/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
