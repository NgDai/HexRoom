# ==============================================================================
# HexRoom Frontend - Multi-stage Production Dockerfile
# Stage 1: Build React/Vite application using Node 22 (Alpine)
# Stage 2: Serve optimized static files with Nginx Alpine + Reverse Proxy
# ==============================================================================

# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Cache package dependencies layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Build argument for API URL (optional: if omitted, defaults to relative /api via Nginx reverse proxy)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Increase Node heap memory to 2048MB (prevents JavaScript heap out of memory on low-RAM VPS/EC2)
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build production bundle
RUN npm run build

# ---- Production Server Stage ----
FROM nginx:1.27-alpine AS runner

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
