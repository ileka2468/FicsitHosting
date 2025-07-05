#!/bin/bash

# Full Development Setup Script
# This script starts all services needed for development

echo "🚀 Starting Full Development Environment"
echo "========================================"

# Create .env files if they don't exist
if [ ! -f .env ]; then
    echo "📝 Creating frontend .env file..."
    cp .env.development .env
fi


# Start frontend
echo "🌐 Starting Frontend..."
echo "📦 Installing dependencies..."
npm install

echo "🚀 Starting frontend development server..."
echo ""
echo "🎯 Development URLs:"
echo "   Frontend:     http://localhost:5173"
echo "   Auth Service: http://localhost:8081"
echo "   MailHog UI:   http://localhost:8025"
echo ""
echo "🔍 Auth Service Endpoints:"
echo "   Health:  GET  http://localhost:8081/api/auth/health"
echo "   Login:   POST http://localhost:8081/api/auth/signin"
echo "   Signup:  POST http://localhost:8081/api/auth/signup"
echo ""

# Start the development server
npm run dev
