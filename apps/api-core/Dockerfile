# Multi-stage Docker build for optimization

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Copy package files and lockfile
COPY package.json pnpm-lock.yaml* tsconfig.json ./

# Install all dependencies
# Note: For reproducible builds, generate pnpm-lock.yaml locally first with: pnpm install
# The lockfile will be copied if it exists in the build context
RUN set -e; \
  if [ -f pnpm-lock.yaml ]; then \
  echo "✅ Using pnpm-lock.yaml for reproducible build"; \
  pnpm install --frozen-lockfile; \
  else \
  echo "⚠️  pnpm-lock.yaml not found - installing dependencies"; \
  echo "💡 Tip: Run 'pnpm install' locally and commit pnpm-lock.yaml for consistent builds"; \
  pnpm install; \
  fi

# Copy source code and NestJS config
COPY src ./src
COPY scripts ./scripts
COPY nest-cli.json tsconfig.json tsconfig.build.json ./

# Build NestJS application with increased memory
ENV NODE_OPTIONS=--max-old-space-size=8192
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Copy package files and lockfile (if exists)
COPY package.json pnpm-lock.yaml* ./
# Note: pnpm-lock.yaml should be generated locally with 'pnpm install' and committed
# If missing, pnpm will install latest compatible versions (less reproducible)

# Install production dependencies only
RUN set -e; \
  if [ -f pnpm-lock.yaml ]; then \
  echo "✅ Using pnpm-lock.yaml for reproducible build"; \
  pnpm install --frozen-lockfile --prod && pnpm store prune; \
  else \
  echo "⚠️  pnpm-lock.yaml not found - installing dependencies"; \
  pnpm install --prod && pnpm store prune; \
  fi

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Set NODE_PATH
ENV NODE_PATH=/app/node_modules

# =============================================================================
# Railway Port Configuration
# =============================================================================
#
# Railway automatically sets the PORT environment variable at runtime.
# The application reads PORT from environment and binds to 0.0.0.0.
#
# Port Resolution (in order of priority):
# 1. PORT (Railway sets this automatically) - Highest priority
# 2. BACKEND_PORT (Manual override, if set)
# 3. Default: 8080 (Development fallback)
#
# IMPORTANT: Railway maps its dynamic PORT to the container's exposed port.
# We expose 8080 as a common default, but Railway will use its own PORT value.
# The application code handles this automatically - no manual configuration needed.
#
# =============================================================================
EXPOSE 8080

# Health check endpoint for Railway
# Uses PORT env var (Railway provides) or falls back to 8080
# Railway uses this to determine service health
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || '8080') + '/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start NestJS application
CMD ["node", "dist/main.js"]

