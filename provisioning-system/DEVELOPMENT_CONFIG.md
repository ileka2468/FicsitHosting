# Development Configuration Guide

## Fast Heartbeat Configuration for Development

This guide shows how to configure faster heartbeat intervals for development and testing.

## Quick Setup

### 1. Orchestrator Fast Configuration
```bash
# Copy development settings
cp .env.development .env

# Restart services  
docker-compose down && docker-compose up -d
```

### 2. Host Agent Fast Configuration

The host agent now uses a `.env` file that's built into the Docker image.

**Quick Development Setup:**
```bash
# Copy development settings
cp .env.development .env

# Rebuild container to include new settings
docker-compose build

# Restart with new settings
docker-compose up -d
```

### 3. Restart Services
```bash
# Orchestrator (no rebuild needed)
docker-compose down && docker-compose up -d

# Host Agent (requires rebuild due to .env file copy)
docker-compose build && docker-compose up -d
```

## Super Quick Development Mode

**Both services in fast mode:**
```bash
# Orchestrator
cd orchestrator/
cp .env.development .env
docker-compose up -d

# Host Agent  
cd ../host-agent/
cp .env.development .env
docker-compose build && docker-compose up -d
```

## Configuration Priority

### Host Agent
1. **docker-compose.yml environment variables** (highest priority)
2. **.env file built into container** (loaded automatically)
3. **Default values in code** (fallback)

You can override .env file settings by uncommenting environment variables in docker-compose.yml.

### Orchestrator
1. **System environment variables** (highest priority)
2. **.env file in working directory** (if present)
3. **application.properties defaults** (fallback)

### Orchestrator Environment Variables
| Variable | Default | Development | Description |
|----------|---------|-------------|-------------|
| `HEARTBEAT_INTERVAL` | 120000ms (2 min) | 10000ms (10 sec) | How often to check node health |
| `HEALTH_CHECK_INTERVAL` | 120000ms (2 min) | 10000ms (10 sec) | Same as heartbeat interval |
| `TIMEOUT_MINUTES` | 3 | 0.5 (30 sec) | Minutes before marking node offline |
| `SHOW_SQL` | false | true | Show SQL queries in logs |
| `LOG_LEVEL` | INFO | DEBUG | Logging level |

### Host Agent Environment Variables
| Variable | Default | Development | Description |
|----------|---------|-------------|-------------|
| `HEARTBEAT_INTERVAL` | 60 sec | 10 sec | How often to send heartbeat |
| `HEARTBEAT_TIMEOUT` | 10 sec | 5 sec | HTTP timeout for heartbeat requests |
| `MAX_HEARTBEAT_FAILURES` | 3 | 2 | Failures before re-registration |

## Expected Behavior with Fast Configuration

### Production (Default)
- Host agent sends heartbeat every 60 seconds
- Orchestrator checks node health every 2 minutes
- Nodes marked offline after 3 minutes of missed heartbeats

### Development (Fast)
- Host agent sends heartbeat every 10 seconds
- Orchestrator checks node health every 10 seconds
- Nodes marked offline after 30 seconds of missed heartbeats
- More verbose logging with timestamps

## Testing Network Issues

### Simulate Network Loss
```bash
# Stop host-agent to simulate network loss
docker-compose -f host-agent/docker-compose.yml stop

# Check orchestrator logs - should see node marked offline after 30 seconds
docker-compose -f orchestrator/docker-compose.yml logs -f orchestrator
```

### Simulate Recovery
```bash
# Start host-agent to simulate recovery
docker-compose -f host-agent/docker-compose.yml start

# Check logs - should see re-registration and node back online
docker-compose -f host-agent/docker-compose.yml logs -f host-agent
```

## Log Examples

### Host Agent Logs (Fast Mode)
```
[2025-07-03T14:30:00.123456] Host Agent Configuration:
  Node ID: node-1
  Orchestrator URL: http://satisfactory-orchestrator:8080
  Heartbeat Interval: 10 seconds
  Heartbeat Timeout: 5 seconds
  Max Failures: 2
[2025-07-03T14:30:10.123456] Heartbeat sent successfully for node-1
[2025-07-03T14:30:20.123456] Heartbeat sent successfully for node-1
```

### Orchestrator Logs (Fast Mode)
```
Node node-1 missed heartbeat, marking as OFFLINE (Last heartbeat: 2025-07-03T14:30:20.123456Z UTC, Timeout: 0.5 minutes)
```

## Actuator Endpoints

The actuator endpoints are now explicitly configured to be accessible:
- `GET /actuator/health` - Application health status
- `GET /actuator/info` - Application information
- `GET /actuator/metrics` - Application metrics

These endpoints are useful for monitoring and debugging the application state.

## Reverting to Production

To revert to production settings:
1. Remove or rename `.env` file in orchestrator directory
2. Comment out development environment variables in host-agent `docker-compose.yml`
3. Restart services: `docker-compose down && docker-compose up -d`
