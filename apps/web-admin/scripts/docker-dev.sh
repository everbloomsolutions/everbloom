#!/bin/bash

# Docker Dev: start mongo + redis from root compose (one Compose Application). Run web-admin with pnpm dev.
# Usage: ./scripts/docker-dev.sh [up|down|logs|status|restart] [service]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.dev.yaml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    exit 1
fi
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Error: Docker daemon is not running.${NC}"
    exit 1
fi
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: $COMPOSE_FILE not found.${NC}"
    exit 1
fi

cd "$REPO_ROOT"

case "${1:-}" in
    up)
        echo "Starting mongo + redis (one Compose Application)..."
        docker compose -f "$COMPOSE_FILE" up -d
        echo -e "${GREEN}mongo + redis started. Run web-admin locally: pnpm dev${NC}"
        docker compose -f "$COMPOSE_FILE" ps
        ;;
    down)
        echo "Stopping mongo + redis..."
        docker compose -f "$COMPOSE_FILE" down
        echo -e "${GREEN}Stopped.${NC}"
        ;;
    logs)
        if [ -n "${2:-}" ]; then
            docker compose -f "$COMPOSE_FILE" logs -f "${2}"
        else
            docker compose -f "$COMPOSE_FILE" logs -f
        fi
        ;;
    status)
        docker compose -f "$COMPOSE_FILE" ps
        ;;
    restart)
        if [ -n "${2:-}" ]; then
            docker compose -f "$COMPOSE_FILE" restart "${2}"
        else
            docker compose -f "$COMPOSE_FILE" restart
        fi
        echo -e "${GREEN}Done.${NC}"
        ;;
    *)
        echo "Docker Dev: mongo + redis only. Run web-admin with pnpm dev."
        echo "Usage: $0 [up|down|logs|status|restart] [mongo|redis]"
        exit 1
        ;;
esac
