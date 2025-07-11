# Host Agent Configuration

The host agent uses a `.env` file that is built into the Docker image for configuration.

## Quick Start

### Development Mode (Fast Heartbeat)
```bash
# Copy development settings
cp .env.development .env

# Rebuild and restart
docker-compose build && docker-compose up -d
```

### Production Mode (Normal Heartbeat)
```bash  
# Copy production settings
cp .env.production .env

# Rebuild and restart
docker-compose build && docker-compose up -d
```

## Configuration Files

- **`.env`** - Current configuration (built into Docker image)
- **`.env.development`** - Fast heartbeat settings (10s intervals)
- **`.env.production`** - Production settings (60s intervals)

## Settings

| Setting | Development | Production |
|---------|-------------|------------|
| Heartbeat Interval | 10 seconds | 60 seconds |
| Heartbeat Timeout | 5 seconds | 10 seconds |
| Max Failures | 2 | 3 |
| Use Container Hostnames | true | false |

## Override Settings

You can override .env file settings by uncommenting environment variables in `docker-compose.yml`:

```yaml
environment:
  - HEARTBEAT_INTERVAL=5  # Override .env file setting
```

## Important Notes

- The `.env` file is **copied into the Docker image** during build
- You must **rebuild the container** after changing the `.env` file
- Environment variables in `docker-compose.yml` take priority over `.env` file
- The agent will display current configuration on startup
- Set `USE_CONTAINER_HOSTNAMES` to `false` in production if the host agent and
  game servers are on separate Docker hosts
- Use `/api/rathole/clients/shutdown-all` to close all active tunnels
- FRP client logs are written to `/var/log/frp/<server_id>.log` inside the
  container
