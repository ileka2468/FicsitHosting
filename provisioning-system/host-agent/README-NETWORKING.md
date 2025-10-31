# Host Agent - Docker Network Architecture

This host agent runs in a Docker container and manages both Rathole clients and Satisfactory server containers on a shared Docker network.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Host                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              satis_network (Bridge)                │    │
│  │                                                    │    │
│  │  ┌──────────────────┐    ┌─────────────────────┐   │    │
│  │  │   Host Agent     │    │  Satisfactory       │   │    │
│  │  │   Container      │    │  Server Container   │   │    │
│  │  │                  │    │                     │   │    │
│  │  │ ┌──────────────┐ │    │  hostname: server1  │   │    │
│  │  │ │ Rathole      │ │    │  container_name:    │   │    │
│  │  │ │ Client       │◄┼────┤  server1            │   │    │
│  │  │ │ Process      │ │    │                     │   │    │
│  │  │ └──────────────┘ │    │  Game Port: 7777    │   │    │
│  │  │                  │    │  Beacon Port: 15000 │   │    │
│  │  │ hostname:        │    └─────────────────────┘   │    │
│  │  │ host-agent       │                             │    │
│  │  └──────────────────┘                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Ports exposed to host:                                     │
│  - 8080 (Host Agent API)                                    │
│  - 7777 (Game traffic, forwarded to container)             │
│  - 15000 (Beacon traffic, forwarded to container)          │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ Internet
                               ▼
            ┌─────────────────────────────────────┐
            │           VPS Server                │
            │                                     │
            │  ┌───────────────────────────────┐  │
            │  │   Rathole Instance Manager    │  │
            │  │   (Flask API)                 │  │
            │  │                               │  │
            │  │  ┌─────────────────────────┐  │  │
            │  │  │ Rathole Server Process  │  │  │
            │  │  │ for server1            │  │  │
            │  │  │                        │  │  │
            │  │  │ Public Port: 30001     │◄─┼──┼── Players connect here
            │  │  │ Public Port: 30002     │  │  │
            │  │  └─────────────────────────┘  │  │
            │  └───────────────────────────────┘  │
            └─────────────────────────────────────┘
```

## Network Communication

### 1. Host Agent to Satisfactory Server
- **Connection**: Docker network `satis_network`
- **Address**: Uses container hostname (e.g., `server1:7777`)
- **Protocol**: Direct container-to-container communication

### 2. Rathole Client Configuration
```toml
[client]
remote_addr = "vps-ip:7001"
default_token = "secure-token"

[client.services.server1_game]
local_addr = "server1:7777"  # ← Container hostname, not localhost!

[client.services.server1_beacon]
local_addr = "server1:15000"  # ← Container hostname, not localhost!
```

### 3. Key Changes from Previous Architecture
- **Before**: Rathole client connected to `127.0.0.1:7777` (localhost)
- **Now**: Rathole client connects to `server1:7777` (container hostname)
- **Reason**: Host agent and Satisfactory server run in separate containers

## Deployment

### 1. Configuration
```bash
# Copy environment template
cp .env .env

# Edit configuration
nano .env
```

### 2. Required Environment Variables
```bash
# Update these in .env:
RATHOLE_INSTANCE_MANAGER_HOST=your-vps-ip
RATHOLE_TOKEN=your-secure-token
HOST_AGENT_API_KEY=your-api-key
NODE_ID=unique-node-identifier
```

### 3. Deploy
```bash
./deploy-host-agent.sh
```

## Container Management

### Start a Satisfactory Server
```bash
# The host agent API will:
# 1. Create a new container with hostname = server_id
# 2. Connect it to satis_network
# 3. Start a Rathole client process
# 4. Configure client to connect to container by hostname
```

### Docker Network Details
```bash
# View network
docker network inspect satis_network

# List containers on network
docker network ls
docker ps --format "table {{.Names}}\t{{.Networks}}"
```

## Troubleshooting

### Check Container Communication
```bash
# Enter host agent container
docker exec -it satis-host-agent bash

# Test connectivity to Satisfactory server
ping server1
telnet server1 7777
```

### Verify Rathole Client Configuration
```bash
# Check generated config files
ls -la rathole-configs/
cat rathole-configs/server1.toml
```

### Monitor Rathole Processes
```bash
# View host agent logs
docker-compose logs -f host-agent

# Check running processes inside container
docker exec satis-host-agent ps aux | grep rathole
```

## Security Notes

1. **Network Isolation**: All containers run on isolated `satis_network`
2. **No Host Network**: Containers don't use host networking mode
3. **Port Binding**: Only necessary ports are exposed to host
4. **Token Security**: Rathole tokens should be unique and secure

## Rathole Client Lifecycle

1. **Server Provisioning**: Orchestrator calls host agent API
2. **Container Creation**: Host agent creates Satisfactory server container
3. **Network Connection**: Container joins `satis_network` with hostname = server_id
4. **Client Registration**: Host agent calls instance manager to register server
5. **Config Generation**: Instance manager returns client config with correct hostname
6. **Client Start**: Host agent starts Rathole client process with generated config
7. **Tunnel Establishment**: Client connects to server container via Docker network
