#!/usr/bin/env bash
set -euo pipefail
: "${DEPLOY_DIRECTORY:?Set the deployment directory}"
: "${ERYXON_IMAGE:?Set the released image digest}"
[[ "$ERYXON_IMAGE" =~ ^ghcr.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$ ]] || { echo 'Expected an immutable GHCR image digest' >&2; exit 1; }
cd "$DEPLOY_DIRECTORY"
printf 'Deployment target: %s; image: %s\n' "$DEPLOY_DIRECTORY" "$ERYXON_IMAGE"
compose=(docker compose --env-file .env)
if [ -f .release-image.env ]; then compose+=(--env-file .release-image.env); fi
current_container=$("${compose[@]}" ps -q eryxon-flow)
previous_image=
if [ -n "$current_container" ]; then
  previous_image=$(docker inspect --format '{{.Image}}' "$current_container")
fi
# Refuse old server configurations that still hard-code latest.
configured_image=$("${compose[@]}" config --images eryxon-flow)
[ "$configured_image" = "$ERYXON_IMAGE" ] || { echo 'Server Compose must use ERYXON_IMAGE for the app service' >&2; exit 1; }
docker pull "$ERYXON_IMAGE"
previous_state=$(mktemp)
state_existed=false
if [ -f .release-image.env ]; then
  cp .release-image.env "$previous_state"
  state_existed=true
fi
trap 'rm -f "$previous_state"' EXIT
printf 'ERYXON_IMAGE=%s\n' "$ERYXON_IMAGE" > .release-image.env
compose=(docker compose --env-file .env --env-file .release-image.env)
if ! "${compose[@]}" up -d --wait --wait-timeout 90 eryxon-flow; then
  if [ -n "$previous_image" ]; then
    export ERYXON_IMAGE="$previous_image"
    printf 'ERYXON_IMAGE=%s\n' "$previous_image" > .release-image.env
    if ! "${compose[@]}" up -d --pull never --wait --wait-timeout 90 eryxon-flow; then
      echo 'Deployment failed; restoring the previous image also failed its health check' >&2
      exit 1
    fi
  else
    # A failed first deployment must not leave a restarting application behind.
    "${compose[@]}" rm --stop --force eryxon-flow
    if [ "$state_existed" = true ]; then
      cp "$previous_state" .release-image.env
    else
      rm -f .release-image.env
    fi
  fi
  echo 'Deployment failed its health check' >&2
  exit 1
fi
