#!/bin/sh
set -eu

sh /docker-runtime-config.sh /etc/eryxon/index.html /usr/share/nginx/html
exec nginx -g "daemon off;"
