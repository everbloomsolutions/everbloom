#!/usr/bin/env bash
set -euo pipefail

# Generate a local .env.development.local file for api-core.
# This script is AWS-free: it does not create or read AWS Secrets Manager secrets.
# It only writes a gitignored file with local MongoDB, Redis, and JWT values.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL_ENV_FILE="${LOCAL_ENV_FILE:-$REPO_ROOT/apps/api-core/.env.development.local}"
LOCAL_MONGODB_URI="${LOCAL_MONGODB_URI:-mongodb://localhost:27017/everbloom}"
LOCAL_REDIS_URL="${LOCAL_REDIS_URL:-redis://localhost:6379}"

if [ -f "$LOCAL_ENV_FILE" ]; then
  echo "Warning: $LOCAL_ENV_FILE already exists and will be overwritten."
fi

JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 64)}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(openssl rand -base64 64)}"

cat > "$LOCAL_ENV_FILE" <<EOF
NODE_ENV=development
LOG_LEVEL=debug
MONGODB_URI=${LOCAL_MONGODB_URI}
REDIS_URL=${LOCAL_REDIS_URL}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
# CLOUDINARY_CLOUD_NAME=REPLACE
# CLOUDINARY_API_KEY=REPLACE
# CLOUDINARY_API_SECRET=REPLACE
# GOOGLE_MAPS_API_KEY=REPLACE
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=
EOF

echo "Local development env file created: $LOCAL_ENV_FILE"
echo "Next: start MongoDB + Redis with: docker compose -f docker-compose.dev.yaml up -d"
echo "Then: run api-core with: pnpm dev"
