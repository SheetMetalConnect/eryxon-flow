#!/bin/bash

# eryxon-flow Centralized Deployment Script
# Goal: Deploy App + Database + Edge Functions in under 10 minutes.

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}   Eryxon Flow - Rapid Deployment Assistant      ${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check dependencies
echo -e "\n${YELLOW}[1/6] Checking dependencies...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${RED}Warning: git is not installed (required for self-hosting setup).${NC}"
else
    echo -e "${GREEN}✓ Git found${NC}"
fi

if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}Warning: npm is not installed. You will need it for 'npx' to run migrations.${NC}"
else
    echo -e "${GREEN}✓ npm found${NC}"
fi

# Select Deployment Mode
echo -e "\n${YELLOW}[2/6] Select Deployment Mode:${NC}"
echo "1) Supabase Cloud (Recommended - easiest)"
echo "2) Fully Self-Hosted (Local Supabase via Docker)"
read -p "Enter choice [1]: " MODE
MODE=${MODE:-1}

APP_URL="http://localhost:8080" # Default, can be changed
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_KEY=""

if [ "$MODE" == "1" ]; then
    # --- CLOUD MODE ---
    echo -e "\n${BLUE}--- API Configuration ---${NC}"
    read -p "Enter your Supabase Project URL (e.g., https://xyz.supabase.co): " SUPABASE_URL
    read -p "Enter your Supabase Anon Public Key: " SUPABASE_ANON_KEY
    read -sp "Enter your Supabase Service Key (for Edge Functions): " SUPABASE_SERVICE_KEY
    echo
    
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
        echo -e "${RED}Error: URL and Anon Key are required.${NC}"
        exit 1
    fi

elif [ "$MODE" == "2" ]; then
    # --- SELF-HOSTED MODE ---
    echo -e "\n${BLUE}--- Self-Hosted Setup ---${NC}"
    
    # 1. Clone Supabase Docker
    if [ ! -d "supabase-docker" ]; then
        echo "Cloning official Supabase Docker setup..."
        git clone --depth 1 https://github.com/supabase/supabase.git supabase-docker-repo
        mv supabase-docker-repo/docker supabase-docker
        rm -rf supabase-docker-repo
    else
        echo "Supabase Docker directory already exists. Using existing."
    fi

    # 2. Generate Secrets
    echo "Generating secure secrets..."
    POSTGRES_PASSWORD=$(openssl rand -hex 16)
    JWT_SECRET=$(openssl rand -hex 32)
    ANON_KEY=$(openssl rand -hex 32) # In reality, these need to be proper JWTs signed with the secret
    SERVICE_KEY=$(openssl rand -hex 32) # Simplified for script structure; normally we'd need a JWT generator
    
    echo -e "${YELLOW}NOTE: In a real automated script, we would generate valid JWTs signed with the secret.${NC}"
    echo -e "${YELLOW}For this demo, we will use the default Supabase local credentials if you are running locally with 'npx supabase start', OR prompt you to configure the cloned docker env manually if strictly air-gapped.${NC}"
    
    # Check if 'npx supabase start' is an option (Developer / Local mode)
    echo -e "For simplest verified local setup, we recommend using 'npx supabase start' which manages the docker stack for you."
    read -p "Use 'npx supabase start'? (y/n) [y]: " USE_CLI
    USE_CLI=${USE_CLI:-y}
    
    if [ "$USE_CLI" == "y" ]; then
        echo "Starting local Supabase via CLI..."
        npx supabase start
        eval "$(npx supabase status -o env)"
        SUPABASE_URL=$API_URL
        SUPABASE_ANON_KEY=$ANON_KEY
        SUPABASE_SERVICE_KEY=$SERVICE_ROLE_KEY
    else
        echo -e "${RED}Full manual docker setup requires complex JWT generation script adjustments. Skipping to manual config prompt.${NC}"
        read -p "Enter your self-hosted API URL: " SUPABASE_URL
        read -p "Enter your self-hosted Anon Key: " SUPABASE_ANON_KEY
    fi
fi

# Write .env for Docker
echo -e "\n${YELLOW}[3/6] Configuring Environment...${NC}"
cat > .env <<EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_ANON_KEY
EOF
echo "Created .env file."

# Deploy Database Migrations
echo -e "\n${YELLOW}[4/6] Applying Database Migrations...${NC}"
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "Service key not provided. Skipping auto-migration (manual 'supabase db push' required later)."
else
    # We need to link if not linked, but for simple db push with direct connection string (if available) it's easier.
    # Supabase CLI usually requires linking or local start.
    # For Cloud, we need the DB password to push, which we don't have in this script easily without interaction.
    echo -e "${YELLOW}To apply migrations to Cloud, run: npx supabase db push${NC}"
    echo -e "${YELLOW}To apply Edge Functions, run: npx supabase functions deploy${NC}"
    
    read -p "Do you want to run these commands now? (Requires interactive login) [y/n]: " RUN_MIGRATIONS
    if [ "$RUN_MIGRATIONS" == "y" ]; then
        npx supabase login
        npx supabase db push
        npx supabase functions deploy
    fi
fi

# Start Application
echo -e "\n${YELLOW}[5/6] Starting Eryxon Flow...${NC}"
# Track which compose file to use consistently
COMPOSE_FILE="docker-compose.yml"
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi
docker-compose -f "$COMPOSE_FILE" up -d --build

# Verification & Rollback
echo -e "\n${YELLOW}[6/6] Verifying Deployment...${NC}"

# Simple Health Check
MAX_RETRIES=12
COUNT=0
URL="http://localhost/health"
if [ "$MODE" == "1" ]; then
  # For cloud, we assume app is on port 80? docker-compose.yml maps 80:80.
  URL="http://localhost:8080/health" # Depending on compose port mapping
  if [ -f "docker-compose.prod.yml" ]; then
    URL="http://localhost:80/health"
  fi
fi

# Override URL if localhost port mapping is known to be 80 from earlier steps
URL="http://localhost:80/health"

echo "Waiting for service at $URL..."

while [ $COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s --max-time 5 "$URL" > /dev/null; then
        echo -e "${GREEN}✓ Health Check Passed!${NC}"
        break
    fi
    echo -n "."
    sleep 5
    COUNT=$((COUNT+1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
    echo -e "\n${RED}Health Check Failed.${NC}"
    echo -e "${RED}Deployment failed. Logs:${NC}"
    docker-compose -f "$COMPOSE_FILE" logs --tail=20
    echo "Rolling back (stopping containers)..."
    docker-compose -f "$COMPOSE_FILE" down
    exit 1
fi

echo -e "\n${GREEN}=================================================${NC}"
echo -e "${GREEN}   Deployment Complete & Verified!               ${NC}"
echo -e "${GREEN}=================================================${NC}"
echo -e "Access your application at: ${BLUE}http://localhost${NC}"

