# FRP Integration Documentation

## Overview

This document explains how **FRP (Fast Reverse Proxy)** replaces Rathole in the provisioning system. The external API remains compatible but all tunnels are now handled by frps/frpc.

## Architecture

```
Internet → VPS (frps) → Host Node (frpc) → Satisfactory Container
          Public IP:GamePort      Private IP:GamePort       127.0.0.1:GamePort
```

### Components

1. **frps** - Runs on the public VPS and exposes game ports
2. **frpc** - Runs on each host node and connects back to frps
3. **Orchestrator** - Unchanged, still calls the instance manager API
4. **Host Agent** - Starts frpc processes with generated configs

## Flow

### 1. Server Provisioning (`provisionServer`)

```
1. Orchestrator creates GameServer record
2. Orchestrator allocates ports (gamePort, beaconPort)
3. Orchestrator sends spawn request to Host Agent
4. Host Agent spawns Satisfactory container
5. Host Agent starts **frpc** for the server
6. Orchestrator records the allocated ports
```

### 2. Server Start (`startServer`)

```
1. Orchestrator sends start request to Host Agent
2. Host Agent starts existing container
3. Host Agent starts **frpc** (if not running)
4. frpc automatically exposes the game ports via frps
```

### 3. Server Stop (`stopServer`)

```
1. Orchestrator sends stop request to Host Agent
2. Host Agent stops container
3. Host Agent stops the **frpc** process
4. Ports are freed in the instance manager
```

## Configuration

### Orchestrator (application.yml)

```yaml
app:
  rathole:
    server:
      host: "your-public-vps-ip"
      control-port: 7000
    api-token: "your-secure-api-token"
```

### Host Agent (Environment Variables)

```bash
RATHOLE_SERVER_HOST=your-public-vps-ip
RATHOLE_SERVER_PORT=2333
RATHOLE_TOKEN=your-secure-api-token
RATHOLE_CLIENT_BINARY=/usr/local/bin/rathole
```

### frps Config

Located in `/home/orion/satis_host/project/provisioning-system/frp-server/frps.ini`:

```ini
[common]
bind_port = 7000
token = your-secure-api-token
dashboard_port = 7500
dashboard_user = admin
dashboard_pwd  = strongpwd
```

## Implementation Details

### Host Agent Integration

The host agent now includes:

1. **FRP Client Management**:
   - `start_frp_client(server_id, server_name, game_port, beacon_port)`
   - `stop_frp_client(server_id)`
   - Process tracking in `frp_clients` dictionary

2. **Container Lifecycle Integration**:
   - frpc started when container is spawned
   - frpc stopped when container is stopped
   - Automatic cleanup of config files and processes

3. **API Endpoints**:
   - `GET /api/rathole/clients` - List all frpc processes
   - `POST /api/rathole/clients/<server_id>/start` - Start client manually
   - `POST /api/rathole/clients/<server_id>/stop` - Stop client manually

### FRP Client Configuration

Each server gets its own frpc client config file:

```toml
[common]
server_addr = "frp-server:7000"
server_port = 7000
token       = "your-token"

[client.services.srv_123_game]
local_addr = "127.0.0.1:7777"

[client.services.srv_123_beacon]
local_addr = "127.0.0.1:15000"
```

### Orchestrator Coordination

The orchestrator:

1. **Allocates ports via the instance manager** and captures the returned `frps_port` and `frps_token`
2. **Coordinates timing**:
   - These values are forwarded to host agents when spawning or starting containers
   - Instance entry removed on server stop/delete

## File Structure

```
provisioning-system/
├── orchestrator/
│   └── src/main/java/.../service/FrpService.java
├── host-agent/
│   ├── agent.py (with frpc integration)
│   └── Dockerfile (includes frp binary)
├── frp-server/
│   ├── frp_instance_manager.py
│   └── frps.ini
└── FRP_INTEGRATION.md (this file)
```

## Port Allocation

Each Satisfactory server requires 2 ports:
- **Game Port**: Main game traffic (TCP)
- **Beacon Port**: Server discovery (UDP)

These ports are:
1. Allocated by orchestrator per server
2. Bound by Satisfactory container on host node
3. Tunneled by frpc to frps
4. Exposed publicly by frps

## Security

- All tunnel traffic encrypted by frp
- API token authentication between components
- Isolated client configs per server
- Automatic cleanup prevents port leaks

## Troubleshooting

### Check frpc Status

```bash
# Via API
curl http://host-agent:8081/api/rathole/clients

# Via process list
ps aux | grep frpc
```

### View frpc Logs

frpc processes are started with stdout/stderr pipes; check agent logs.

### Verify Tunnel Configuration

```bash
# Check server-side tunnels (requires frps dashboard API)
curl "http://frp-server:7500/api/proxy" -u admin:strongpwd
```

### Common Issues

1. **Port conflicts**: Ensure ports are properly allocated and not in use
2. **frpc binary missing**: Verify frpc is installed in host agent container
3. **Network connectivity**: Ensure host agent can reach frps
4. **Config syntax**: Validate TOML syntax in generated client configs

## Deployment Steps

1. **Deploy frps** on public VPS
2. **Update Orchestrator** with instance manager details
3. **Rebuild Host Agent** with frpc binary
4. **Configure Environment Variables** for all components
5. **Test End-to-End** with a sample server provision

## Next Steps

1. Add monitoring for frpc process health
2. Implement frps tunnel status reporting
3. Add automatic retry logic for failed tunnels
4. Consider container-based frpc clients for isolation
