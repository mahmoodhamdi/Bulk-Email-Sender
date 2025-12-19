#!/bin/bash

# ============================================================
# Bulk Email Sender - Docker Start Script (Linux/macOS)
# ============================================================
# Automatically finds available ports and starts containers
# ============================================================

set -e

echo "============================================================"
echo "Bulk Email Sender - Docker Startup"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default starting ports
APP_PORT_START=${1:-3000}
DB_PORT_START=${2:-5432}
REDIS_PORT_START=${3:-6379}
MAX_ATTEMPTS=10

# Function to check if port is available
port_is_available() {
    local port=$1
    if command -v lsof &> /dev/null; then
        ! lsof -i :$port &> /dev/null
    elif command -v ss &> /dev/null; then
        ! ss -tuln | grep -q ":$port "
    elif command -v netstat &> /dev/null; then
        ! netstat -tuln | grep -q ":$port "
    else
        # If no tool available, assume port is free
        return 0
    fi
}

# Function to find available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    local attempts=0

    while [ $attempts -lt $MAX_ATTEMPTS ]; do
        if port_is_available $port; then
            echo $port
            return 0
        fi
        echo -e "${YELLOW}[INFO]${NC} Port $port is busy, trying next..." >&2
        ((port++))
        ((attempts++))
    done

    echo -e "${RED}[ERROR]${NC} Could not find available port starting from $start_port" >&2
    return 1
}

# Find available ports
echo -e "${BLUE}[INFO]${NC} Checking port availability..."

APP_PORT=$(find_available_port $APP_PORT_START)
if [ $? -ne 0 ]; then exit 1; fi
echo -e "${GREEN}[OK]${NC} Using port $APP_PORT for app"

DB_PORT=$(find_available_port $DB_PORT_START)
if [ $? -ne 0 ]; then exit 1; fi
echo -e "${GREEN}[OK]${NC} Using port $DB_PORT for PostgreSQL"

REDIS_PORT=$(find_available_port $REDIS_PORT_START)
if [ $? -ne 0 ]; then exit 1; fi
echo -e "${GREEN}[OK]${NC} Using port $REDIS_PORT for Redis"

echo ""
echo "============================================================"
echo "Starting containers with ports:"
echo "  App:      http://localhost:$APP_PORT"
echo "  Postgres: localhost:$DB_PORT"
echo "  Redis:    localhost:$REDIS_PORT"
echo "============================================================"
echo ""

# Change to docker directory
cd "$(dirname "$0")"

# Export environment variables and start docker-compose
export APP_PORT
export DB_PORT
export REDIS_PORT

docker-compose up -d --build

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================================"
    echo -e "${GREEN}[SUCCESS]${NC} Containers started successfully!"
    echo ""
    echo "  Application: http://localhost:$APP_PORT"
    echo "  Database:    postgresql://postgres:postgres@localhost:$DB_PORT/emailsender"
    echo "  Redis:       redis://localhost:$REDIS_PORT"
    echo ""
    echo "Commands:"
    echo "  View logs:   docker-compose logs -f"
    echo "  Stop:        docker-compose down"
    echo "  Restart:     docker-compose restart"
    echo "============================================================"

    # Save the ports to a file for reference
    cat > .ports <<EOF
APP_PORT=$APP_PORT
DB_PORT=$DB_PORT
REDIS_PORT=$REDIS_PORT
EOF
    echo ""
    echo -e "${BLUE}[INFO]${NC} Port configuration saved to docker/.ports"
else
    echo ""
    echo -e "${RED}[ERROR]${NC} Failed to start containers"
    exit 1
fi
