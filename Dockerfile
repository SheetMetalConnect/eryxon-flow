# Build stage
FROM node:20-alpine AS builder

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

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
