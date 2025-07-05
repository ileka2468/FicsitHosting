#!/bin/bash

# Deploy Host Agent with proper Docker networking
# This script sets up the host agent with a shared Docker network for Rathole client and Satisfactory server communication

set -e

echo "🚀 Deploying Host Agent with Docker Network Support..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please copy one of the template files:"
    echo "  - For development: cp .env .env"
    echo "  - For production: cp .env.production .env"
    echo "Then edit the .env file with your configuration."
    exit 1
fi

# Source environment variables to validate them
source .env

echo "📋 Configuration Summary:"
echo "  Node ID: ${NODE_ID}"
echo "  Orchestrator: ${ORCHESTRATOR_HOST}:${ORCHESTRATOR_PORT}"
echo "  Rathole Instance Manager: ${RATHOLE_INSTANCE_MANAGER_HOST}:${RATHOLE_INSTANCE_MANAGER_PORT}"
echo "  Host Agent Port: ${HOST_AGENT_PORT:-8080}"
echo ""

# Validate required variables
if [ "${RATHOLE_INSTANCE_MANAGER_HOST}" = "your-public-vps-ip-here" ]; then
    echo "❌ Please update RATHOLE_INSTANCE_MANAGER_HOST in .env file with your actual VPS IP"
    exit 1
fi

if [ "${RATHOLE_TOKEN}" = "your-secure-api-token-here" ]; then
    echo "❌ Please update RATHOLE_TOKEN in .env file with your secure token"
    exit 1
fi

if [ "${HOST_AGENT_API_KEY}" = "your-secure-host-agent-api-key-here" ]; then
    echo "❌ Please update HOST_AGENT_API_KEY in .env file with your secure API key"
    exit 1
fi

echo "🔧 Creating necessary directories..."
mkdir -p data rathole-configs

echo "🐳 Building host agent container..."
docker-compose build

echo "🌐 Creating Docker network for container communication..."
# The docker-compose.yml will create the network, but we can ensure it exists
docker network inspect satis_network >/dev/null 2>&1 || docker network create satis_network

echo "🚀 Starting host agent..."
docker-compose up -d

echo ""
echo "✅ Host Agent deployed successfully!"
echo ""
echo "📊 Status:"
docker-compose ps

echo ""
echo "📝 Key Points:"
echo "  • Host agent runs in container 'satis-host-agent'"
echo "  • Satisfactory servers will be created on 'satis_network' Docker network"
echo "  • Rathole clients connect to Satisfactory servers by container name (server_id)"
echo "  • All containers can resolve each other by hostname on the shared network"
echo ""
echo "🔍 View logs:"
echo "  docker-compose logs -f"
echo ""
echo "🛑 Stop:"
echo "  docker-compose down"
echo ""
echo "🔄 Restart after changes:"
echo "  docker-compose down && docker-compose build && docker-compose up -d"
