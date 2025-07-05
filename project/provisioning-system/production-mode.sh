#!/bin/bash

# Production Mode Setup Script
# This script sets both orchestrator and host-agent to production mode

echo "🏭 Setting up Production Mode (Normal Heartbeat)"
echo "=============================================="

# Orchestrator setup
echo "📋 Configuring Orchestrator..."
cd orchestrator/
cp .env.production .env
echo "✅ Orchestrator .env updated"

# Host Agent setup
echo "🤖 Configuring Host Agent..."
cd ../host-agent/
cp .env.production .env
echo "✅ Host Agent .env updated"

echo ""
echo "⚙️  Starting services..."
echo "Orchestrator: docker-compose up -d"
echo "Host Agent:   docker-compose build && docker-compose up -d"
echo ""
echo "🎯 Production Configuration:"
echo "   - Heartbeat every 60 seconds"
echo "   - Health check every 2 minutes"  
echo "   - Timeout after 3 minutes"
echo "   - Info logging level"
echo ""
echo "🔧 To switch to development:"
echo "   ./development-mode.sh"
