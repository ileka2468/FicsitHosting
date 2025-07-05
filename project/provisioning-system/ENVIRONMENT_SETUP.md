# Environment Variables Setup Guide

## Required Environment Variables for Individual Rathole Instances

### For Host Agents (.env file)

```bash
# === NODE CONFIGURATION ===
NODE_ID=node-1                                    # Unique identifier for this host node
ORCHESTRATOR_URL=http://satisfactory-orchestrator:8080  # Orchestrator service URL

# === RATHOLE INDIVIDUAL INSTANCE CONFIGURATION ===
RATHOLE_INSTANCE_MANAGER_HOST=your-public-vps-ip  # IP of your public VPS running instance manager
RATHOLE_INSTANCE_MANAGER_PORT=7001                # Port where instance manager API runs
RATHOLE_TOKEN=your-secure-api-token-here          # Secure token for API authentication
RATHOLE_CLIENT_BINARY=/usr/local/bin/rathole      # Path to Rathole binary (already in Docker)

# === HEARTBEAT SETTINGS ===
HEARTBEAT_INTERVAL=60                              # Seconds between heartbeats to orchestrator
HEARTBEAT_TIMEOUT=10                               # Timeout for heartbeat requests
MAX_HEARTBEAT_FAILURES=3                           # Max failures before re-registration

# === FLASK SETTINGS ===
FLASK_DEBUG=false                                  # Set to true for development
FLASK_ENV=production                               # production or development
```

### For Orchestrator (application.yml)

```yaml
app:
  public-ip: "your-public-vps-ip"
  
  rathole:
    instance-manager:
      host: "your-public-vps-ip"              # Same as RATHOLE_INSTANCE_MANAGER_HOST
      port: 7001                              # Same as RATHOLE_INSTANCE_MANAGER_PORT
    api-token: "your-secure-api-token-here"   # Same as RATHOLE_TOKEN
```

### For Instance Manager (Environment Variables)

```bash
# === INSTANCE MANAGER CONFIGURATION ===
API_TOKEN=your-secure-api-token-here               # Must match RATHOLE_TOKEN
SERVER_PORT=7001                                   # Port for instance manager API
RATHOLE_BINARY=/usr/local/bin/rathole              # Path to Rathole binary
BASE_DATA_DIR=/data/rathole-instances              # Directory for instance configs
PUBLIC_IP=your-public-vps-ip                      # Public IP for tunnel endpoints

# === PORT ALLOCATION ===
RATHOLE_PORT_START=10000                           # Start of port range for instances
RATHOLE_PORT_END=20000                             # End of port range for instances

# === FLASK SETTINGS ===
FLASK_ENV=production                               # production or development
```

## Quick Setup Steps

### 1. Generate Secure Token
```bash
# Generate a secure API token
openssl rand -hex 32
# Example output: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 2. Update Host Agent Environment
```bash
cd /path/to/host-agent
cp .env.production .env

# Edit .env file:
nano .env

# Update these values:
RATHOLE_INSTANCE_MANAGER_HOST=your.public.vps.ip
RATHOLE_TOKEN=your-generated-secure-token
```

### 3. Update Orchestrator Configuration
```bash
cd /path/to/orchestrator
nano src/main/resources/application.yml

# Update the rathole section with your VPS IP and token
```

### 4. Deploy Instance Manager
```bash
cd /path/to/provisioning-system

# Create docker-compose.override.yml with your environment variables
cat > docker-compose.override.yml << EOF
version: '3.8'
services:
  rathole-instance-manager:
    environment:
      - PUBLIC_IP=your.public.vps.ip
      - API_TOKEN=your-generated-secure-token
EOF

# Start instance manager
docker-compose -f docker-compose.individual-instances.yml up -d rathole-instance-manager
```

### 5. Rebuild and Restart Host Agents
```bash
# On each host node:
docker-compose down
docker-compose build
docker-compose up -d
```

## Verification

### Check Instance Manager
```bash
# Health check
curl http://your-vps-ip:7001/health

# List instances (should be empty initially)
curl "http://your-vps-ip:7001/api/instances?token=your-token"
```

### Check Host Agent
```bash
# Health check
curl http://host-node-ip:8081/health

# Check Rathole clients (should be empty initially)
curl http://host-node-ip:8081/api/rathole/clients
```

### Test End-to-End
1. Create a test server through the orchestrator
2. Check that an instance is created in the instance manager
3. Check that a Rathole client is started on the host agent
4. Verify tunnel connectivity

## Important Notes

- **Security**: Use a strong, unique token for `RATHOLE_TOKEN`
- **Firewall**: Ensure ports 7001 and 10000-20000 are open on your VPS
- **DNS**: Consider using domain names instead of IP addresses for better management
- **Backup**: Keep track of your environment variables for disaster recovery
- **Monitoring**: Monitor the instance manager and host agent logs for issues

## Troubleshooting

### Common Issues

1. **"Failed to get client config"**
   - Check `RATHOLE_INSTANCE_MANAGER_HOST` is correct
   - Verify instance manager is running and accessible
   - Check firewall rules

2. **"Invalid token"**
   - Ensure `RATHOLE_TOKEN` matches across all services
   - Check for whitespace or encoding issues

3. **"No available ports"**
   - Increase `RATHOLE_PORT_END` or clean up old instances
   - Check port conflicts with other services

4. **"Process already exists"**
   - Restart host agent to clean up zombie processes
   - Check for duplicate server IDs
