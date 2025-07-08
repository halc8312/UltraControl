#!/bin/bash

# UltraControl Development Environment Starter
# This script starts all necessary services for development

set -e

echo "🚀 UltraControl Development Environment Starter"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed. Please install it first.${NC}"
        exit 1
    fi
}

echo "🔍 Checking prerequisites..."
check_command node
check_command pnpm
check_command git

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"

# Function to kill all background processes on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"
    # Kill all child processes
    pkill -P $$ || true
    exit 0
}

trap cleanup EXIT INT TERM

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    pnpm install
fi

# Check for environment file
ENV_FILE="packages/ultracontrol-app/.env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  No .env.local found. Creating from example...${NC}"
    cp packages/ultracontrol-app/.env.example "$ENV_FILE"
    echo -e "${RED}❗ Please edit $ENV_FILE with your API keys${NC}"
    echo "Press Enter to continue after adding your API keys..."
    read
fi

# Create logs directory
mkdir -p logs

# Start services
echo -e "\n${GREEN}🚀 Starting services...${NC}"

# Start UltraControl App
echo -e "${YELLOW}Starting UltraControl App...${NC}"
cd packages/ultracontrol-app
pnpm dev > ../../logs/ultracontrol-app.log 2>&1 &
ULTRACONTROL_PID=$!
cd ../..

# Wait for UltraControl to start
sleep 3

# Check if OpenHands backend exists and start if available
if [ -d "packages/OpenHands-main" ]; then
    echo -e "${YELLOW}Starting OpenHands Backend...${NC}"
    cd packages/OpenHands-main
    
    # Check if poetry is installed
    if command -v poetry &> /dev/null; then
        poetry run uvicorn openhands.server.app:app --reload --host 0.0.0.0 --port 8000 > ../../logs/openhands.log 2>&1 &
        OPENHANDS_PID=$!
    else
        echo -e "${YELLOW}⚠️  Poetry not found. Skipping OpenHands backend.${NC}"
    fi
    cd ../..
fi

# Optional: Start Devin Clone if needed
# if [ -d "packages/devin-clone-mvp" ]; then
#     echo -e "${YELLOW}Starting Devin Clone...${NC}"
#     cd packages/devin-clone-mvp/frontend
#     pnpm dev > ../../../logs/devin-frontend.log 2>&1 &
#     DEVIN_FRONTEND_PID=$!
#     cd ../../..
# fi

# Wait for services to start
echo -e "\n${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 5

# Check service status
check_service() {
    if curl -s -o /dev/null -w "%{http_code}" $1 | grep -q "200\|404"; then
        echo -e "${GREEN}✅ $2 is running at $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $2 is not responding at $1${NC}"
        return 1
    fi
}

echo -e "\n${GREEN}📊 Service Status:${NC}"
echo "================================"

# Check main app
if check_service "http://localhost:5173" "UltraControl App"; then
    echo "   View logs: tail -f logs/ultracontrol-app.log"
fi

# Check OpenHands if started
if [ ! -z "$OPENHANDS_PID" ]; then
    if check_service "http://localhost:8000" "OpenHands Backend"; then
        echo "   View logs: tail -f logs/openhands.log"
    fi
fi

echo "================================"
echo -e "\n${GREEN}🎉 Development environment is ready!${NC}"
echo -e "\n${YELLOW}Quick Actions:${NC}"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Check logs in the 'logs' directory"
echo "  3. Press Ctrl+C to stop all services"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  - View app logs:     tail -f logs/ultracontrol-app.log"
echo "  - Run tests:         cd packages/ultracontrol-app && pnpm test"
echo "  - Build for prod:    cd packages/ultracontrol-app && pnpm build"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""

# Keep script running and show logs
echo "Press Ctrl+C to stop all services"
echo ""
echo "=== Live Logs (UltraControl App) ==="
tail -f logs/ultracontrol-app.log