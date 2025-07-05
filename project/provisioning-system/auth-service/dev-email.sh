#!/bin/bash

# Development Email Setup Script for Satisfactory Host Auth Service

echo "🚀 Satisfactory Host - Development Email Setup"
echo "=============================================="

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose first."
    exit 1
fi

# Function to show usage
show_usage() {
    echo "Usage: $0 [start|stop|restart|logs|ui|status]"
    echo ""
    echo "Commands:"
    echo "  start    - Start all services (auth-service, database, mailhog)"
    echo "  stop     - Stop all services"
    echo "  restart  - Restart all services"
    echo "  logs     - Show logs from all services"
    echo "  ui       - Open MailHog web interface"
    echo "  status   - Show status of all services"
    echo ""
}

# Function to start services
start_services() {
    echo "🔄 Starting auth service with MailHog..."
    docker-compose up -d
    echo "✅ Services started!"
    echo ""
    echo "📧 MailHog Web UI: http://localhost:8025"
    echo "🔐 Auth Service: http://localhost:8081"
    echo ""
    echo "Test email functionality by:"
    echo "1. Registering a new user through your frontend"
    echo "2. Check MailHog UI for the verification email"
}

# Function to stop services
stop_services() {
    echo "🔄 Stopping services..."
    docker-compose down
    echo "✅ Services stopped!"
}

# Function to restart services
restart_services() {
    echo "🔄 Restarting services..."
    docker-compose restart
    echo "✅ Services restarted!"
}

# Function to show logs
show_logs() {
    echo "📋 Showing logs (Press Ctrl+C to exit)..."
    docker-compose logs -f
}

# Function to open MailHog UI
open_ui() {
    echo "🌐 Opening MailHog Web UI..."
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:8025
    elif command -v open &> /dev/null; then
        open http://localhost:8025
    else
        echo "📧 MailHog Web UI available at: http://localhost:8025"
        echo "Please open this URL in your browser."
    fi
}

# Function to show status
show_status() {
    echo "📊 Service Status:"
    docker-compose ps
    echo ""
    echo "🔗 Service URLs:"
    echo "  📧 MailHog Web UI: http://localhost:8025"
    echo "  🔐 Auth Service: http://localhost:8081"
    echo "  🗄️  Database: localhost:5433"
}

# Main script logic
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    ui)
        open_ui
        ;;
    status)
        show_status
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
