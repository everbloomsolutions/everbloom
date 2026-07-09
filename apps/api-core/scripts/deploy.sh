#!/bin/bash

# Deployment script
# Usage: ./scripts/deploy.sh [environment] [--podman|--docker]
# Defaults to Podman if available, falls back to Docker

set -e

ENVIRONMENT=${1:-production}
CONTAINER_ENGINE=""

# Detect container engine preference
if [[ "$2" == "--podman" ]]; then
    CONTAINER_ENGINE="podman"
elif [[ "$2" == "--docker" ]]; then
    CONTAINER_ENGINE="docker"
else
    # Auto-detect: prefer Podman, fallback to Docker
    if command -v podman &> /dev/null; then
        CONTAINER_ENGINE="podman"
    elif command -v docker &> /dev/null; then
        CONTAINER_ENGINE="docker"
    fi
fi

if [ -z "$CONTAINER_ENGINE" ]; then
    echo "Error: Neither Podman nor Docker is installed."
    echo "Please install Podman (preferred) or Docker first."
    exit 1
fi

echo "Deploying to $ENVIRONMENT environment using $CONTAINER_ENGINE..."

# Build container image
echo "Building container image..."
$CONTAINER_ENGINE build -t back-end:latest .

# Tag image
$CONTAINER_ENGINE tag back-end:latest back-end:$ENVIRONMENT

# Run database migrations (if needed)
echo "Running database migrations..."
# Add migration commands here

# Deploy (example - adjust based on your deployment target)
echo "Deploying application..."
# For Podman: podman-compose up -d
# For Docker: docker-compose up -d
# Or: kubectl apply -f k8s/
# Or: Deploy to cloud platform

echo "Deployment completed successfully!"
echo "Container engine used: $CONTAINER_ENGINE"

