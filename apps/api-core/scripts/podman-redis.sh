#!/bin/bash

# Podman Redis Management Script
# Usage: ./scripts/podman-redis.sh [start|stop|restart|status|logs|remove|exec]

set -e

CONTAINER_NAME="back-end-redis"
IMAGE="docker.io/library/redis:7-alpine"
PORT="6379"
VOLUME_NAME="back-end-redis-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Podman is installed
if ! command -v podman &> /dev/null; then
    echo -e "${RED}Error: Podman is not installed.${NC}"
    echo "Install Podman: https://podman.io/getting-started/installation"
    exit 1
fi

# Function to check if container exists
container_exists() {
    podman ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"
}

# Function to check if container is running
container_running() {
    podman ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"
}

# Function to check network connectivity
check_network() {
    if command -v ping &> /dev/null; then
        if ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Function to start Redis container
start_redis() {
    if container_running; then
        echo -e "${YELLOW}Redis container is already running.${NC}"
        return 0
    fi

    # Create volume if it doesn't exist
    if ! podman volume exists "$VOLUME_NAME" 2>/dev/null; then
        echo "Creating volume: $VOLUME_NAME"
        podman volume create "$VOLUME_NAME"
    fi

    # Pull image if not exists
    echo "Checking for Redis image..."
    if ! podman image exists "$IMAGE" 2>/dev/null; then
        # Check network connectivity first
        if ! check_network; then
            echo -e "${YELLOW}Warning: Network connectivity check failed.${NC}"
            echo "Continuing anyway - Podman will attempt to pull the image..."
        fi
        
        echo "Pulling Redis image..."
        
        # Try pulling the image with timeout handling
        PULL_SUCCESS=false
        PULL_OUTPUT=$(podman pull "$IMAGE" 2>&1)
        PULL_EXIT=$?
        
        if [ $PULL_EXIT -eq 0 ]; then
            PULL_SUCCESS=true
        else
            # Check if it's a timeout error
            if echo "$PULL_OUTPUT" | grep -qi "timeout\|i/o timeout"; then
                echo -e "${YELLOW}Network timeout detected. This is usually a temporary network issue.${NC}"
                echo "Retrying once more in 3 seconds..."
                sleep 3
                if podman pull "$IMAGE" >/dev/null 2>&1; then
                    PULL_SUCCESS=true
                    echo -e "${GREEN}Successfully pulled on retry.${NC}"
                else
                    echo -e "${YELLOW}Retry also failed.${NC}"
                fi
            else
                echo -e "${YELLOW}Failed to pull image. Error details:${NC}"
                echo "$PULL_OUTPUT" | tail -5
            fi
        fi
        
        if [ "$PULL_SUCCESS" = false ]; then
            echo ""
            echo -e "${RED}Failed to pull Redis image from all registries.${NC}"
            echo ""
            echo "Common causes:"
            echo "- Network connectivity issues (firewall, proxy, DNS)"
            echo "- Registry timeout (temporary network issues)"
            echo "- Podman registry configuration problems"
            echo ""
            echo "Troubleshooting steps:"
            echo "1. Check network: ping -c 3 8.8.8.8"
            echo "2. Test DNS: nslookup docker.io"
            echo "3. Try manual pull: podman pull docker.io/library/redis:7-alpine"
            echo "4. Wait a few minutes and retry (temporary network/registry issues)"
            echo "5. Check proxy settings: ~/.config/containers/containers.conf"
            echo ""
            echo "Note: Podman requires fully qualified image names (e.g., docker.io/library/redis:7-alpine)"
            echo "      To use short names like 'redis:7-alpine', configure unqualified-search-registries:"
            echo "      Edit /etc/containers/registries.conf and add:"
            echo "      unqualified-search-registries = ['docker.io']"
            echo ""
            echo "Workarounds:"
            echo "- Wait a few minutes and retry (temporary network issues)"
            echo "- Import pre-downloaded image: podman load -i redis-image.tar"
            echo "- Use a different network/VPN if available"
            exit 1
        fi
    else
        echo -e "${GREEN}Redis image already exists locally.${NC}"
    fi

    echo "Starting Redis container..."
    podman run -d \
        --name "$CONTAINER_NAME" \
        -p "$PORT:6379" \
        -v "$VOLUME_NAME:/data" \
        --restart unless-stopped \
        "$IMAGE" \
        redis-server --appendonly yes

    if container_running; then
        echo -e "${GREEN}Redis container started successfully.${NC}"
        echo "Connection URL: redis://localhost:$PORT"
        
        # Wait a moment for Redis to be ready
        sleep 2
        
        # Test connection
        if podman exec "$CONTAINER_NAME" redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}Redis is ready and responding.${NC}"
        else
            echo -e "${YELLOW}Redis container started but not yet ready.${NC}"
        fi
    else
        echo -e "${RED}Failed to start Redis container.${NC}"
        exit 1
    fi
}

# Function to stop Redis container
stop_redis() {
    if ! container_exists; then
        echo -e "${YELLOW}Redis container does not exist.${NC}"
        return 0
    fi

    if ! container_running; then
        echo -e "${YELLOW}Redis container is not running.${NC}"
        return 0
    fi

    echo "Stopping Redis container..."
    podman stop "$CONTAINER_NAME"
    echo -e "${GREEN}Redis container stopped.${NC}"
}

# Function to restart Redis container
restart_redis() {
    if ! container_exists; then
        echo -e "${YELLOW}Redis container does not exist. Creating new container...${NC}"
        start_redis
        return 0
    fi

    echo "Restarting Redis container..."
    podman restart "$CONTAINER_NAME"
    echo -e "${GREEN}Redis container restarted.${NC}"
}

# Function to show container status
show_status() {
    if ! container_exists; then
        echo -e "${YELLOW}Redis container does not exist.${NC}"
        return 0
    fi

    echo "Redis Container Status:"
    echo "======================"
    
    if container_running; then
        echo -e "Status: ${GREEN}Running${NC}"
        
        # Show container info
        podman ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        # Test connection
        if podman exec "$CONTAINER_NAME" redis-cli ping > /dev/null 2>&1; then
            echo -e "Connection: ${GREEN}OK${NC}"
            
            # Show Redis info
            echo ""
            echo "Redis Info:"
            podman exec "$CONTAINER_NAME" redis-cli info server | grep -E "redis_version|uptime_in_seconds|connected_clients"
        else
            echo -e "Connection: ${RED}Failed${NC}"
        fi
    else
        echo -e "Status: ${RED}Stopped${NC}"
        podman ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}"
    fi
    
    echo ""
    echo "Volume: $VOLUME_NAME"
    if podman volume exists "$VOLUME_NAME" 2>/dev/null; then
        echo -e "Volume Status: ${GREEN}Exists${NC}"
    else
        echo -e "Volume Status: ${YELLOW}Not Created${NC}"
    fi
}

# Function to show logs
show_logs() {
    if ! container_exists; then
        echo -e "${RED}Redis container does not exist.${NC}"
        exit 1
    fi

    echo "Redis Container Logs:"
    echo "====================="
    podman logs "$CONTAINER_NAME" "$@"
}

# Function to remove container
remove_redis() {
    if ! container_exists; then
        echo -e "${YELLOW}Redis container does not exist.${NC}"
        return 0
    fi

    if container_running; then
        echo "Stopping container first..."
        podman stop "$CONTAINER_NAME"
    fi

    echo "Removing Redis container..."
    podman rm "$CONTAINER_NAME"
    echo -e "${GREEN}Redis container removed.${NC}"
    
    read -p "Remove volume $VOLUME_NAME? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if podman volume exists "$VOLUME_NAME" 2>/dev/null; then
            podman volume rm "$VOLUME_NAME"
            echo -e "${GREEN}Volume removed.${NC}"
        fi
    fi
}

# Function to execute command in container
exec_redis() {
    if ! container_exists; then
        echo -e "${RED}Redis container does not exist.${NC}"
        exit 1
    fi

    if ! container_running; then
        echo -e "${RED}Redis container is not running.${NC}"
        exit 1
    fi

    shift # Remove first argument
    if [ $# -eq 0 ]; then
        # Default to redis-cli
        podman exec -it "$CONTAINER_NAME" redis-cli
    else
        podman exec -it "$CONTAINER_NAME" "$@"
    fi
}

# Main command handler
case "${1:-}" in
    start)
        start_redis
        ;;
    stop)
        stop_redis
        ;;
    restart)
        restart_redis
        ;;
    status)
        show_status
        ;;
    logs)
        shift
        show_logs "$@"
        ;;
    remove)
        remove_redis
        ;;
    exec)
        exec_redis "$@"
        ;;
    *)
        echo "Podman Redis Management Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start     Start Redis container"
        echo "  stop      Stop Redis container"
        echo "  restart   Restart Redis container"
        echo "  status    Show container status"
        echo "  logs      Show container logs (add -f for follow)"
        echo "  remove    Remove container (and optionally volume)"
        echo "  exec      Execute command in container (default: redis-cli)"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 status"
        echo "  $0 logs -f"
        echo "  $0 exec redis-cli ping"
        exit 1
        ;;
esac

