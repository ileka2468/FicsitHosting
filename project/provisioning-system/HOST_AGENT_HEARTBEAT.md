# Host-Agent Registration & Heartbeat System

## Overview
The host-agent implements a robust registration and heartbeat system to maintain connectivity with the orchestrator and enable proper node health monitoring.

## Registration Process

### Initial Registration
1. **On Startup**: Host-agent automatically registers with orchestrator
2. **Endpoint**: `POST /api/nodes/register`
3. **Data Sent**:
   ```json
   {
     "nodeId": "node-1",
     "hostname": "host-machine",
     "ipAddress": "192.168.1.100",
     "maxServers": 20
   }
   ```
4. **Retry Logic**: 5 attempts with exponential backoff (5s, 10s, 20s, 40s, 80s)
5. **Result**: Node record created/updated in orchestrator database

### Re-registration
- Triggered automatically after 3 consecutive heartbeat failures
- Uses same retry logic as initial registration
- Helps recover from network issues or orchestrator restarts

## Heartbeat System

### Frequency & Timing

#### Production Settings (Default)
- **Heartbeat Interval**: Every 60 seconds
- **Health Check Interval**: Every 2 minutes (orchestrator side)
- **Timeout Threshold**: 3 minutes without heartbeat = OFFLINE
- **Max Heartbeat Failures**: 3 consecutive failures trigger re-registration

#### Development Settings (Configurable)
For faster testing and development, you can configure shorter intervals:

**Orchestrator Environment Variables:**
```bash
HEARTBEAT_INTERVAL=10000        # Check every 10 seconds (default: 120000ms)
HEALTH_CHECK_INTERVAL=10000     # Check every 10 seconds (default: 120000ms)
TIMEOUT_MINUTES=0.5             # Timeout after 30 seconds (default: 3 minutes)
```

**Host Agent Environment Variables:**
```bash
HEARTBEAT_INTERVAL=10           # Send heartbeat every 10 seconds (default: 60)
HEARTBEAT_TIMEOUT=5             # Timeout after 5 seconds (default: 10)
MAX_HEARTBEAT_FAILURES=2        # Re-register after 2 failures (default: 3)
```

#### Quick Development Setup
1. **Orchestrator**: Copy `.env.development` to `.env` in the orchestrator directory
2. **Host Agent**: Uncomment the development environment variables in `docker-compose.yml`
3. **Restart Services**: `docker-compose down && docker-compose up -d`

**Example fast development configuration:**
- Heartbeat every 10 seconds
- Health check every 10 seconds  
- Timeout after 30 seconds
- More verbose logging with timestamps

### Heartbeat Data
Each heartbeat includes:
```json
{
  "cpuUsage": 45.2,
  "memoryUsage": 67.8,
  "diskUsage": 23.4,
  "containerCount": 3,
  "timestamp": "2025-07-03T10:30:00Z"
}
```

### Health Monitoring Flow
1. **Host-Agent**: Sends stats every 60 seconds to `/api/nodes/{nodeId}/stats`
2. **Orchestrator**: Updates node's `lastHeartbeat` timestamp and sets status to ONLINE
3. **Health Monitor**: Checks all nodes every 2 minutes
4. **Timeout Detection**: Nodes with `lastHeartbeat` > 3 minutes ago marked as OFFLINE

## Error Handling & Recovery

### Host-Agent Side
- **Connection Failures**: Retry with exponential backoff
- **Consecutive Failures**: After 3 failures, attempt re-registration
- **Logging**: All failures logged with details for debugging

### Orchestrator Side
- **Missing Heartbeats**: Automatic OFFLINE marking after 3 minutes
- **Database Errors**: Graceful error handling in health checks
- **Recovery**: Nodes automatically return to ONLINE when heartbeats resume

## Configuration

### Host-Agent Environment Variables
```bash
NODE_ID=node-1                                    # Unique node identifier
ORCHESTRATOR_URL=http://satisfactory-orchestrator:8080  # Orchestrator endpoint
```

### Timing Configuration
- **Heartbeat Interval**: 60 seconds (configurable in agent.py)
- **Health Check Interval**: 2 minutes (configurable via @Scheduled)
- **Timeout Threshold**: 3 minutes (configurable in NodeSchedulerService)

## Monitoring & Troubleshooting

### Logs to Monitor
**Host-Agent:**
```
Successfully registered with orchestrator as node-1
Heartbeat sent successfully for node-1
Error sending heartbeat to orchestrator: Connection refused
Too many heartbeat failures (3), attempting re-registration...
```

**Orchestrator:**
```
Node node-1 missed heartbeat, marking as OFFLINE
Node stats updated successfully for node-1
```

### Common Issues
1. **Network Connectivity**: Check if host-agent can reach orchestrator URL
2. **Registration Failures**: Verify orchestrator is running and accessible
3. **Heartbeat Timeouts**: Check network latency and orchestrator health
4. **Database Issues**: Monitor orchestrator database connectivity

## Best Practices

### Production Deployment
1. **Monitoring**: Set up alerts for node OFFLINE status
2. **Logging**: Centralize logs for both host-agent and orchestrator
3. **Health Checks**: Monitor the health check service itself
4. **Backup**: Ensure node registration survives restarts

### Scaling Considerations
- Heartbeat interval can be adjusted based on cluster size
- Consider using dedicated health check endpoints for large deployments
- Monitor database performance with many nodes
