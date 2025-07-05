# Orchestrator Configuration

The orchestrator uses a `.env` file for environment configuration, making it easy to switch between development and production settings.

## Quick Start

### Development Mode (Fast Heartbeat)
```bash
# Copy development settings
cp .env.development .env

# Restart services
docker-compose down && docker-compose up -d
```

### Production Mode (Normal Heartbeat)
```bash  
# Copy production settings
cp .env.production .env

# Restart services
docker-compose down && docker-compose up -d
```

## Configuration Files

- **`.env`** - Current configuration (production by default)
- **`.env.development`** - Fast heartbeat settings (10s intervals)
- **`.env.production`** - Production settings (2min intervals)

## Settings

### Health Check Timings
| Setting | Development | Production |
|---------|-------------|------------|
| Heartbeat Interval | 10000ms (10s) | 120000ms (2min) |
| Health Check Interval | 10000ms (10s) | 120000ms (2min) |
| Timeout Minutes | 0.5 (30s) | 3 (3min) |

### Other Settings
| Setting | Development | Production |
|---------|-------------|------------|
| Show SQL | true | false |
| Log Level | DEBUG | INFO |

## Environment Variables

The `.env` file contains all configurable settings:

```bash
# Health Check Configuration
HEARTBEAT_INTERVAL=120000       # How often to check node health (ms)
HEALTH_CHECK_INTERVAL=120000    # Same as heartbeat interval (ms)
TIMEOUT_MINUTES=3               # Minutes before marking node offline

# Database Configuration
POSTGRES_PASSWORD=changeme123
REDIS_PASSWORD=changeme123

# Application Configuration
PUBLIC_IP=YOUR_VPS_PUBLIC_IP    # Update for your environment
RATHOLE_HOST=YOUR_VPS_IP        # Update for your environment
RATHOLE_TOKEN=your_secret_token_here

# Logging
SHOW_SQL=false                  # Show SQL queries in logs
LOG_LEVEL=INFO                  # Logging level

# pgAdmin
PGADMIN_PASSWORD=admin123
```

## Important Notes

- The `.env` file is loaded automatically by Docker Compose
- No container rebuild required when changing `.env` file (unlike host-agent)
- Update placeholder values (`YOUR_VPS_PUBLIC_IP`, etc.) for your environment
- All environment variables are now required (no default fallbacks)

## Services

- **Orchestrator**: `http://localhost:8080`
- **Database**: `localhost:5432` (postgres/satisfactory_orchestrator)
- **Redis**: `localhost:6379`
- **pgAdmin**: `http://localhost:8090` (admin@example.com / from .env)

## Quick Commands

```bash
# Development mode
cp .env.development .env && docker-compose up -d

# Production mode
cp .env.production .env && docker-compose up -d

# View logs
docker-compose logs -f orchestrator

# Stop services
docker-compose down
```
