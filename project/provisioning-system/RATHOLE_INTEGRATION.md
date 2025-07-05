# Rathole Integration Documentation

## Overview

This document explains how Rathole is integrated into the Satisfactory server provisioning system to provide secure tunneling from public endpoints to game servers running on private host nodes.

## Architecture

```
Internet → VPS (Rathole Server) → Host Node (Rathole Client) → Satisfactory Container
          Public IP:GamePort      Private IP:GamePort       127.0.0.1:GamePort
```

### Components

1. **Rathole Server** - Runs on public VPS, exposes public game ports
2. **Rathole Client** - Runs on each host node, connects to Rathole server
3. **Orchestrator** - Manages tunnel configurations via Rathole server API
4. **Host Agent** - Manages Rathole client processes per server

## Flow

### 1. Server Provisioning (`provisionServer`)

```
1. Orchestrator creates GameServer record
2. Orchestrator allocates ports (gamePort, beaconPort)
3. Orchestrator sends spawn request to Host Agent
4. Host Agent spawns Satisfactory container
5. Host Agent starts Rathole client for the server
6. Orchestrator configures Rathole server tunnels
```

### 2. Server Start (`startServer`)

```
1. Orchestrator sends start request to Host Agent
2. Host Agent starts existing container
3. Host Agent starts Rathole client (if not running)
4. Orchestrator ensures Rathole server tunnels exist
```

### 3. Server Stop (`stopServer`)

```
1. Orchestrator sends stop request to Host Agent
2. Host Agent stops container
3. Host Agent stops Rathole client
4. Orchestrator removes Rathole server tunnels
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

### Rathole Server Config

Located in `/home/orion/satis_host/project/provisioning-system/rathole-server/rathole-server.toml`:

```toml
[server]
bind_addr = "0.0.0.0:2333"
default_token = "your-secure-api-token"

[server.control]
bind_addr = "0.0.0.0:7000"
default_token = "your-secure-api-token"
```

## Implementation Details

### Host Agent Integration

The host agent now includes:

1. **Rathole Client Management**:
   - `start_rathole_client(server_id, server_name, game_port, beacon_port)`
   - `stop_rathole_client(server_id)`
   - Process tracking in `rathole_clients` dictionary

2. **Container Lifecycle Integration**:
   - Rathole client started when container is spawned
   - Rathole client stopped when container is stopped
   - Automatic cleanup of config files and processes

3. **API Endpoints**:
   - `GET /api/rathole/clients` - List all Rathole clients
   - `POST /api/rathole/clients/<server_id>/start` - Start client manually
   - `POST /api/rathole/clients/<server_id>/stop` - Stop client manually

### Rathole Client Configuration

Each server gets its own Rathole client config file:

```toml
[client]
remote_addr = "rathole-server:2333"
default_token = "your-token"

[client.services.srv_123_game]
local_addr = "127.0.0.1:7777"

[client.services.srv_123_beacon]
local_addr = "127.0.0.1:15000"
```

### Orchestrator Coordination

The orchestrator:

1. **Creates server-side tunnels** via RatholeService:
   - `{serverId}_game`: Maps public gamePort to `nodeIP:gamePort`
   - `{serverId}_beacon`: Maps public beaconPort to `nodeIP:beaconPort`

2. **Coordinates timing**:
   - Tunnels created after container spawn success
   - Tunnels removed on server stop/delete

## File Structure

```
provisioning-system/
├── orchestrator/
│   └── src/main/java/.../service/RatholeService.java
├── host-agent/
│   ├── agent.py (with Rathole client integration)
│   └── Dockerfile (includes Rathole binary)
├── rathole-server/
│   ├── rathole_api.py
│   └── rathole-server.toml
└── RATHOLE_INTEGRATION.md (this file)
```

## Port Allocation

Each Satisfactory server requires 2 ports:
- **Game Port**: Main game traffic (TCP)
- **Beacon Port**: Server discovery (UDP)

These ports are:
1. Allocated by orchestrator per server
2. Bound by Satisfactory container on host node
3. Tunneled by Rathole client to Rathole server
4. Exposed publicly by Rathole server

## Security

- All tunnel traffic encrypted by Rathole
- API token authentication between components
- Isolated client configs per server
- Automatic cleanup prevents port leaks

## Troubleshooting

### Check Rathole Client Status

```bash
# Via API
curl http://host-agent:8081/api/rathole/clients

# Via process list
ps aux | grep rathole
```

### View Rathole Client Logs

Rathole client processes are started with stdout/stderr pipes, check agent logs.

### Verify Tunnel Configuration

```bash
# Check server-side tunnels
curl "http://rathole-server:7000/api/tunnels?token=your-token"
```

### Common Issues

1. **Port conflicts**: Ensure ports are properly allocated and not in use
2. **Rathole binary missing**: Verify Rathole is installed in host agent container
3. **Network connectivity**: Ensure host agent can reach Rathole server
4. **Config syntax**: Validate TOML syntax in generated client configs

## Deployment Steps

1. **Deploy Rathole Server** on public VPS
2. **Update Orchestrator** with Rathole server details
3. **Rebuild Host Agent** with Rathole binary
4. **Configure Environment Variables** for all components
5. **Test End-to-End** with a sample server provision

## Next Steps

1. Add monitoring for Rathole client health
2. Implement Rathole tunnel status reporting
3. Add automatic retry logic for failed tunnels
4. Consider container-based Rathole clients for isolation
