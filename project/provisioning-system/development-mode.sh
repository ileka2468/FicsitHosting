#!/bin/bash

# Development Mode Setup Script
# This script sets both orchestrator and host-agent to development mode

echo "🚀 Setting up Development Mode (Fast Heartbeat)"
echo "=============================================="

# Orchestrator setup
echo "📋 Configuring Orchestrator..."
cd orchestrator/
cp .env.development .env
echo "✅ Orchestrator .env updated"

# Host Agent setup
echo "🤖 Configuring Host Agent..."
cd ../host-agent/
cp .env.development .env
echo "✅ Host Agent .env updated"

echo ""
echo "⚙️  Starting services..."
echo "Orchestrator: docker-compose up -d"
echo "Host Agent:   docker-compose build && docker-compose up -d"
echo ""
echo "🎯 Development Configuration:"
echo "   - Heartbeat every 10 seconds"
echo "   - Health check every 10 seconds"  
echo "   - Timeout after 30 seconds"
echo "   - Debug logging enabled"
echo ""
echo "🔧 To revert to production:"
echo "   ./production-mode.sh"
