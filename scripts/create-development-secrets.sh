#!/usr/bin/env bash
set -euo pipefail

# Create AWS Secrets Manager secrets for the development environment.
# Override any of the *_PASSWORD / *_URL / *_KEY variables below before running.

AWS_REGION="${AWS_REGION:-ap-south-2}"
SECRET_PREFIX="everbloom/development"

command -v aws >/dev/null 2>&1 || { echo "aws cli is required"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "python3 is required"; exit 1; }

function make_secret_json() {
  python3 -c '
import json, sys
items = sys.stdin.read().strip().split("\n")
d = {}
for line in items:
    if not line:
        continue
    key, sep, value = line.partition("=")
    if sep:
        d[key] = value
print(json.dumps(d))
'
}

function secret_exists() {
  aws secretsmanager describe-secret --region "$AWS_REGION" --secret-id "$1" >/dev/null 2>&1
}

function create_secret() {
  local secret_id=$1
  local secret_string=$2
  if secret_exists "$secret_id"; then
    echo "Secret $secret_id already exists. Skipping creation."
  else
    aws secretsmanager create-secret \
      --region "$AWS_REGION" \
      --name "$secret_id" \
      --secret-string "$secret_string" \
      --description "Development secret for ${secret_id##*/}"
    echo "Created $secret_id"
  fi
}

# Generate random secure values if not provided
MONGO_ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:-$(openssl rand -base64 32)}"
MONGO_APP_PASSWORD="${MONGO_APP_PASSWORD:-$(openssl rand -base64 32)}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 64)}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(openssl rand -base64 64)}"

# Replace these placeholders with real managed service endpoints before running
REDIS_URL="${REDIS_URL:-rediss://default:REPLACE@REPLACE.upstash.io:YOUR_PORT}"
CLOUDINARY_CLOUD_NAME="${CLOUDINARY_CLOUD_NAME:-REPLACE}"
CLOUDINARY_API_KEY="${CLOUDINARY_API_KEY:-REPLACE}"
CLOUDINARY_API_SECRET="${CLOUDINARY_API_SECRET:-REPLACE}"
GOOGLE_MAPS_API_KEY="${GOOGLE_MAPS_API_KEY:-REPLACE}"

# Dev URLs used by web frontends
DEV_API_BASE_URL="${DEV_API_BASE_URL:-https://dev-api.everbloom.com}"
DEV_SOCKET_URL="${DEV_SOCKET_URL:-wss://dev-api.everbloom.com}"

# 1. MongoDB credentials secret
create_secret "$SECRET_PREFIX/mongodb" "$(printf 'root-username=root\nroot-password=%s\nusername=everbloom\npassword=%s\n' "$MONGO_ROOT_PASSWORD" "$MONGO_APP_PASSWORD" | make_secret_json)"

# 2. api-core secret (includes MongoDB URI and managed Redis URL)
MONGODB_URI="mongodb://root:${MONGO_ROOT_PASSWORD}@mongodb:27017/everbloom?authSource=admin"

create_secret "$SECRET_PREFIX/api-core" "$(printf 'mongodb-uri=%s\nredis-url=%s\njwt-secret=%s\njwt-refresh-secret=%s\ncloudinary-cloud-name=%s\ncloudinary-api-key=%s\ncloudinary-api-secret=%s\ngoogle-maps-api-key=%s\n' "$MONGODB_URI" "$REDIS_URL" "$JWT_SECRET" "$JWT_REFRESH_SECRET" "$CLOUDINARY_CLOUD_NAME" "$CLOUDINARY_API_KEY" "$CLOUDINARY_API_SECRET" "$GOOGLE_MAPS_API_KEY" | make_secret_json)"

# 3. web-admin secret
create_secret "$SECRET_PREFIX/web-admin" "$(printf 'api-base-url=%s/api/v1\nsocket-url=%s\n' "$DEV_API_BASE_URL" "$DEV_SOCKET_URL" | make_secret_json)"

# 4. web-public secret
create_secret "$SECRET_PREFIX/web-public" "$(printf 'api-base-url=%s/api/v1\nsocket-url=%s\n' "$DEV_API_BASE_URL" "$DEV_SOCKET_URL" | make_secret_json)"

echo "Development secrets created/verified."
echo "Next: update REDIS_URL, Cloudinary and Google Maps values in AWS Secrets Manager if placeholders were used."
