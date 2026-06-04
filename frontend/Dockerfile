# syntax=docker/dockerfile:1.7
# Multi-stage build for the Kinetic frontend.
# Build context: frontend/ directory
#   docker build -f frontend/Dockerfile -t kinetic-frontend frontend/
# Or via Fly: fly deploy --config infra/fly-frontend.toml

# ---------- Builder ----------
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_* vars must be present at build time — they get inlined into the JS bundle.
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

RUN npm run build

# ---------- Runtime ----------
FROM nginx:1.27-alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
