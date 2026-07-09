#!/bin/bash

# Docker Dev Environment Management Script
# Usage: ./scripts/docker-dev.sh [up|down|logs|status|restart] [service]

set -e

COMPOSE_FILE="docker-compose.dev.yaml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}Error: Docker daemon is not running.${NC}"
    echo "Please start Docker Desktop."
    exit 1
fi

# Change to project directory
cd "$PROJECT_DIR"

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: $COMPOSE_FILE not found in $PROJECT_DIR${NC}"
    exit 1
fi

case "${1:-}" in
    up)
        echo "Starting development services..."
        docker-compose -f "$COMPOSE_FILE" up -d
        echo -e "${GREEN}Development services started.${NC}"
        echo ""
        echo "Services:"
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    down)
        echo "Stopping development services..."
        docker-compose -f "$COMPOSE_FILE" down
        echo -e "${GREEN}Development services stopped.${NC}"
        ;;
    logs)
        if [ -n "${2:-}" ]; then
            docker-compose -f "$COMPOSE_FILE" logs -f "${2}"
        else
            docker-compose -f "$COMPOSE_FILE" logs -f
        fi
        ;;
    status)
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    restart)
        if [ -n "${2:-}" ]; then
            echo "Restarting ${2}..."
            docker-compose -f "$COMPOSE_FILE" restart "${2}"
            echo -e "${GREEN}${2} restarted.${NC}"
        else
            echo "Restarting all services..."
            docker-compose -f "$COMPOSE_FILE" restart
            echo -e "${GREEN}All services restarted.${NC}"
        fi
        ;;
    *)
        echo "Docker Dev Environment Management Script"
        echo ""
        echo "Usage: $0 [command] [service]"
        echo ""
        echo "Commands:"
        echo "  up        Start all development services"
        echo "  down      Stop all development services"
        echo "  logs      View logs (optionally specify service: mongo or redis)"
        echo "  status    Show service status"
        echo "  restart   Restart services (optionally specify service: mongo or redis)"
        echo ""
        echo "Examples:"
        echo "  $0 up"
        echo "  $0 down"
        echo "  $0 logs"
        echo "  $0 logs redis"
        echo "  $0 status"
        echo "  $0 restart"
        echo "  $0 restart mongo"
        exit 1
        ;;
esac

