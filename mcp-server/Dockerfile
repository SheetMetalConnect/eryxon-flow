# Eryxon Flow MCP Server — Docker image
# Runs the MCP server with HTTP/Streamable HTTP transport for cloud deployment

FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production image
FROM node:22-alpine

WORKDIR /app

# Copy built artifacts and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Default to HTTP transport for Docker
ENV MCP_TRANSPORT=http
ENV MCP_PORT=3001
ENV MCP_HOST=0.0.0.0

EXPOSE 3001

# Health check using the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
