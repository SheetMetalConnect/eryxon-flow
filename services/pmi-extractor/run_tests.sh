#!/bin/bash
# Run PMI extraction tests inside Docker container
#
# Usage:
#   ./run_tests.sh           # Build and run tests
#   ./run_tests.sh --no-build  # Run tests without rebuilding

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}PMI Extraction Test Runner${NC}"
echo "================================"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
    echo "Please install Docker to run tests."
    exit 1
fi

# Build if needed
if [ "$1" != "--no-build" ]; then
    echo -e "\n${YELLOW}Building Docker image...${NC}"
    docker build -t cad-processor-test . 2>&1 | tail -10
fi

# Run validation tests
echo -e "\n${YELLOW}Running PMI extraction tests...${NC}"
docker run --rm \
    -v "$SCRIPT_DIR:/app" \
    -w /app \
    cad-processor-test \
    python test_pmi_extraction.py

TEST_EXIT=$?

# Run model creation test
echo -e "\n${YELLOW}Running model creation test...${NC}"
docker run --rm \
    -v "$SCRIPT_DIR:/app" \
    -w /app \
    cad-processor-test \
    python test_create_pmi_model.py

MODEL_EXIT=$?

# Summary
echo -e "\n================================"
if [ $TEST_EXIT -eq 0 ] && [ $MODEL_EXIT -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
