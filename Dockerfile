# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for all VITE env vars (passed at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_TURNSTILE_SITE_KEY
ARG VITE_APP_TITLE
ARG VITE_DEFAULT_LANGUAGE
ARG VITE_DOCS_URL
ARG VITE_CAD_SERVICE_URL
ARG VITE_CAD_SERVICE_API_KEY

# Set as environment variables for Vite build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_DEFAULT_LANGUAGE=$VITE_DEFAULT_LANGUAGE
ENV VITE_DOCS_URL=$VITE_DOCS_URL
ENV VITE_CAD_SERVICE_URL=$VITE_CAD_SERVICE_URL
ENV VITE_CAD_SERVICE_API_KEY=$VITE_CAD_SERVICE_API_KEY

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# OCI image labels
LABEL org.opencontainers.image.title="Eryxon Flow"
LABEL org.opencontainers.image.description="Manufacturing Execution System for sheet metal production"
LABEL org.opencontainers.image.version="0.4.1"
LABEL org.opencontainers.image.source="https://github.com/SheetMetalConnect/eryxon-flow"
LABEL org.opencontainers.image.vendor="Eryxon"
LABEL org.opencontainers.image.licenses="BSL-1.1"

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy entrypoint script for runtime env injection
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["/docker-entrypoint.sh"]
