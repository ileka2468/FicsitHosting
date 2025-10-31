# Individual Rathole Instances Setup Guide

## Overview

This guide explains how to deploy the new **individual Rathole instances** architecture, where each game server gets its own isolated Rathole tunnel setup.

## Architecture Changes

### Before (Shared Rathole)
```
Internet → Shared Rathole Server → Multiple Clients → Multiple Game Servers
          (Single point of failure, restarts affect all servers)
```

### After (Individual Instances)
```
Internet → Individual Rathole Server Instance 1 → Client 1 → Game Server 1
        → Individual Rathole Server Instance 2 → Client 2 → Game Server 2
        → Individual Rathole Server Instance N → Client N → Game Server N
        (Complete isolation, no shared state)
```

## Components

### 1. **Rathole Instance Manager** (`rathole_instance_manager.py`)
- Manages individual Rathole server instances
- Creates/removes instances dynamically per game server
- Provides HTTP API for orchestrator
- Runs on public VPS

### 2. **Updated Orchestrator** 
- Uses `RatholeService` to create/remove individual instances
- Coordinates with host agents for client configuration
- No more shared tunnel management

### 3. **Updated Host Agents**
- Receives client configs from instance manager
- Starts individual Rathole client processes per server
- Complete isolation between server tunnels

## Deployment Steps

### Step 1: Update Configuration

Update your `application.yml` in the orchestrator:

```yaml
app:
  rathole:
    instance-manager:
      host: "your-public-vps-ip"
      port: 7001
    api-token: "your-secure-api-token"
```

### Step 2: Deploy Instance Manager

On your **public VPS**:

```bash
cd /home/orion/satis_host/project/provisioning-system

# Build and start the instance manager
docker-compose -f docker-compose.individual-instances.yml up -d rathole-instance-manager
```

### Step 3: Update Host Agents

On each **host node**, update environment variables:

```bash
# /data/host-agent/.env
RATHOLE_INSTANCE_MANAGER_HOST=your-public-vps-ip
RATHOLE_INSTANCE_MANAGER_PORT=7001
RATHOLE_TOKEN=your-secure-api-token
RATHOLE_CLIENT_BINARY=/usr/local/bin/rathole
```

Rebuild and restart host agents:

```bash
cd /path/to/host-agent
docker-compose down
docker-compose build
docker-compose up -d
```

### Step 4: Update Orchestrator

```bash
cd /home/orion/satis_host/project/provisioning-system
docker-compose -f docker-compose.individual-instances.yml up -d orchestrator
```

## Port Allocation

### Instance Manager Ports
- **Port 7001**: Instance manager HTTP API
- **Ports 10000-20000**: Individual Rathole server instances

### Per-Server Allocation
Each game server gets:
- **1 Rathole server port** (from 10000-20000 range)
- **2 public game ports** (gamePort + beaconPort, from your game port range)

Example:
```
Server srv_123: 
  - Rathole instance on port 10001
  - Game traffic on public ports 30000-30001
  - Client connects to Rathole instance at your-vps:10001
```

## API Endpoints

### Instance Manager API

```bash
# Create instance
POST http://your-vps:7001/api/instances
{
  "server_id": "srv_user123_abcd1234",
  "game_port": 30000,
  "beacon_port": 30001,
  "token": "your-token"
}

# Remove instance  
DELETE http://your-vps:7001/api/instances/srv_user123_abcd1234?token=your-token

# List instances
GET http://your-vps:7001/api/instances?token=your-token

# Get client config
GET http://your-vps:7001/api/instances/srv_user123_abcd1234/client-config?token=your-token&host_ip=host-node-ip
```

### Host Agent API

```bash
# Configure client with provided config
POST http://host-node:8081/api/rathole/clients/srv_user123_abcd1234/configure
{
  "clientConfig": "[client]\nremote_addr = \"vps:10001\"\n..."
}

# Stop client
POST http://host-node:8081/api/rathole/clients/srv_user123_abcd1234/stop

# List clients
GET http://host-node:8081/api/rathole/clients
```

## Flow Example

### Server Provisioning
1. **Orchestrator** calls `RatholeService.createInstance(serverId, gamePort, beaconPort)`
2. **Instance Manager** creates new Rathole server instance on available port (e.g., 10001)
3. **Instance Manager** returns client config for the host node
4. **Orchestrator** sends client config to **Host Agent**
5. **Host Agent** starts Rathole client connecting to the specific instance
6. **Tunnel established**: Internet → VPS:gamePort → VPS:10001 → Host:gamePort → Container:gamePort

### Server Deletion
1. **Orchestrator** calls `RatholeService.removeInstance(serverId)`
2. **Instance Manager** stops and removes Rathole server instance
3. **Orchestrator** tells **Host Agent** to stop Rathole client
4. **Host Agent** stops client process and cleans up config files

## Benefits

### ✅ **Complete Isolation**
- Each server has its own tunnel
- No shared state between servers
- One server's issues don't affect others

### ✅ **No Service Interruptions**
- Adding/removing servers doesn't affect existing ones
- No more restart-related downtime

### ✅ **Better Resource Management**
- Individual process monitoring
- Granular control over each tunnel
- Better debugging and troubleshooting

### ✅ **Scalable**
- Easy to add more port ranges
- Individual instances can be load-balanced
- Better resource distribution

## Troubleshooting

### Check Instance Manager
```bash
# View logs
docker logs satisfactory-rathole-instance-manager

# Check API health
curl http://your-vps:7001/health

# List active instances
curl "http://your-vps:7001/api/instances?token=your-token"
```

### Check Host Agent
```bash
# View agent logs
docker logs satisfactory-host-agent

# Check Rathole clients
curl http://host-node:8081/api/rathole/clients

# Check processes
ps aux | grep rathole
```

### Common Issues

1. **Port conflicts**: Check `RATHOLE_PORT_START/END` ranges don't overlap
2. **Client connection fails**: Verify host agent can reach VPS on instance port
3. **Config errors**: Validate TOML syntax in generated configs
4. **Process zombies**: Instance manager handles process cleanup

## Migration from Shared Setup

1. **Stop existing shared Rathole**: `docker-compose down rathole-server`
2. **Deploy instance manager**: Follow deployment steps above
3. **Update configurations**: Change orchestrator config to use instance manager
4. **Restart all services**: Orchestrator and host agents
5. **Test provisioning**: Create a test server to verify end-to-end flow

## Monitoring

Monitor these metrics:
- Instance manager API response times
- Number of active instances
- Port allocation usage
- Rathole client process health
- Network connectivity between components

The individual instances approach provides much better isolation and eliminates the restart issues you were experiencing!
