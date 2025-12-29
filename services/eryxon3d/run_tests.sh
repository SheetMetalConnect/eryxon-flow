#!/bin/bash
# Run PMI extraction tests inside Docker container
#
# Usage:
#   ./run_tests.sh                    # Build and run tests
#   ./run_tests.sh --no-build         # Run tests without rebuilding
#   ./run_tests.sh --file model.step  # Test with a specific file
#   ./run_tests.sh --nist             # Run NIST batch test
#   ./run_tests.sh --check-handle     # Check Handle_TDocStd_Document availability
#
# Environment variables:
#   PYTHONOCC_VERSION=7.6.2 ./run_tests.sh   # Build with specific version

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}PMI Extraction Test Runner${NC}"
echo "================================"

# Default pythonocc version
PYTHONOCC_VERSION="${PYTHONOCC_VERSION:-7.7.2}"
echo -e "pythonocc-core version: ${BLUE}${PYTHONOCC_VERSION}${NC}"

# Parse arguments
BUILD=true
FILE_ARG=""
DIR_ARG=""
NIST_ARG=""
REPORT_ARG=""
CHECK_HANDLE=false

for arg in "$@"; do
    case $arg in
        --no-build)
            BUILD=false
            ;;
        --file=*)
            FILE_ARG="--file ${arg#*=}"
            ;;
        --file)
            shift
            FILE_ARG="--file $1"
            ;;
        --dir=*)
            DIR_ARG="--dir ${arg#*=}"
            ;;
        --dir)
            shift
            DIR_ARG="--dir $1"
            ;;
        --nist)
            NIST_ARG="--nist"
            ;;
        --report=*)
            REPORT_ARG="--report ${arg#*=}"
            ;;
        --report)
            shift
            REPORT_ARG="--report $1"
            ;;
        --check-handle)
            CHECK_HANDLE=true
            ;;
    esac
done

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
    echo "Please install Docker to run tests."
    exit 1
fi

# Build if needed
if [ "$BUILD" = true ]; then
    echo -e "\n${YELLOW}Building Docker image with pythonocc-core=${PYTHONOCC_VERSION}...${NC}"
    docker build \
        --build-arg PYTHONOCC_VERSION="${PYTHONOCC_VERSION}" \
        -t cad-processor-test . 2>&1 | tail -15
fi

# Check handle if requested
if [ "$CHECK_HANDLE" = true ]; then
    echo -e "\n${YELLOW}Checking Handle_TDocStd_Document availability...${NC}"
    docker run --rm \
        -v "$SCRIPT_DIR:/app" \
        -w /app \
        cad-processor-test \
        python test_handle.py --verbose
    exit $?
fi

# Run validation tests
echo -e "\n${YELLOW}Running PMI extraction tests...${NC}"
docker run --rm \
    -v "$SCRIPT_DIR:/app" \
    -w /app \
    cad-processor-test \
    python test_pmi_extraction.py $FILE_ARG $DIR_ARG $NIST_ARG $REPORT_ARG

TEST_EXIT=$?

# Summary
echo -e "\n================================"
if [ $TEST_EXIT -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
