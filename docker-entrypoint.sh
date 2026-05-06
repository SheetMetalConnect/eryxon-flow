#!/bin/sh
set -e

# Generate runtime environment configuration from VITE_ env vars
ENV_FILE="/usr/share/nginx/html/env.js"
echo "window.__ERYXON_ENV__ = {" > "$ENV_FILE"

# Export all VITE_ prefixed variables. Values are escaped so quotes or
# backslashes in runtime config cannot break the generated JavaScript.
env | grep "^VITE_" | sort | while IFS='=' read -r key value; do
  escaped_value=$(printf '%s' "$value" | sed 's/\\/\\\\/g; s/"/\\"/g')
  echo "  \"$key\": \"$escaped_value\"," >> "$ENV_FILE"
done

echo "};" >> "$ENV_FILE"

echo "Runtime env.js generated with $(env | grep -c '^VITE_' || echo 0) variables"

exec nginx -g "daemon off;"
