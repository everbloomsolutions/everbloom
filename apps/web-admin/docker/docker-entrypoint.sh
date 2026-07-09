#!/bin/sh
set -e

# Use PORT environment variable (provided by deployment platform)
# Default to 8080 if not set
PORT=${PORT:-8080}

# Substitute PORT in nginx config template and write to conf.d
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Inject runtime environment variables into index.html
# This allows Vite env vars to be set at runtime (not just build time)
HTML_FILE="/usr/share/nginx/html/index.html"

if [ -f "$HTML_FILE" ]; then
  # Get API base URL from environment (with fallback)
  API_BASE_URL="${VITE_API_BASE_URL:-}"
  SOCKET_URL="${VITE_SOCKET_URL:-}"
  
  # If API_BASE_URL is not set, try to construct it from backend URL
  if [ -z "$API_BASE_URL" ] && [ -n "$VITE_BACKEND_URL" ]; then
    API_BASE_URL="${VITE_BACKEND_URL}/api/v1"
  fi
  
  # Inject runtime config as a script tag before the closing </head> tag
  if [ -n "$API_BASE_URL" ] || [ -n "$SOCKET_URL" ]; then
    # Create runtime config script
    RUNTIME_CONFIG="<script>window.__RUNTIME_CONFIG__={"
    
    if [ -n "$API_BASE_URL" ]; then
      RUNTIME_CONFIG="${RUNTIME_CONFIG}VITE_API_BASE_URL:'${API_BASE_URL}',"
    fi
    
    if [ -n "$SOCKET_URL" ]; then
      RUNTIME_CONFIG="${RUNTIME_CONFIG}VITE_SOCKET_URL:'${SOCKET_URL}',"
    fi
    
    # Remove trailing comma and close object
    RUNTIME_CONFIG=$(echo "$RUNTIME_CONFIG" | sed 's/,$//')
    RUNTIME_CONFIG="${RUNTIME_CONFIG}};</script>"
    
    # Inject before </head> tag
    sed -i "s|</head>|${RUNTIME_CONFIG}</head>|" "$HTML_FILE"
    
    echo "✅ Injected runtime configuration into index.html"
    echo "   VITE_API_BASE_URL: ${API_BASE_URL:-'not set'}"
    echo "   VITE_SOCKET_URL: ${SOCKET_URL:-'not set'}"
  else
    echo "⚠️  Warning: No runtime configuration variables found"
    echo "   Set VITE_API_BASE_URL or VITE_BACKEND_URL environment variables"
  fi
fi

# Start nginx
exec nginx -g "daemon off;"

