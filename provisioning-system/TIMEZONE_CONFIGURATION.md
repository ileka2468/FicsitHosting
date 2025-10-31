# Database Timezone Configuration

## Overview
The heartbeat timestamps and all other timestamps in the Satisfactory Host orchestrator database are now configured to use **UTC timezone** for consistency and clarity.

## Changes Made

### 1. Application Properties Configuration
Both `orchestrator` and `auth-service` now have explicit timezone configuration:

**File:** `provisioning-system/orchestrator/src/main/resources/application.properties`
**File:** `provisioning-system/auth-service/src/main/resources/application.properties`

```properties
# Time zone configuration
spring.jpa.properties.hibernate.jdbc.time_zone=UTC
spring.jackson.time-zone=UTC
```

### 2. Database Model Updates
Updated all timestamp fields to use `ZonedDateTime` instead of `LocalDateTime`:

- **Node.java**: `createdAt`, `lastHeartbeat` 
- **GameServer.java**: `createdAt`, `startedAt`, `lastSeen`
- **PortAllocation.java**: `allocatedAt`, `releasedAt`

All timestamp fields now use `ZonedDateTime.now(ZoneOffset.UTC)` for initialization.

### 3. Service Layer Updates
Updated all services to use `ZonedDateTime` with UTC:

- **NodeSchedulerService**: Heartbeat updates and health checks
- **ProvisioningService**: Server startup timestamps
- **PortAllocationService**: Port release timestamps

## Benefits

1. **Consistency**: All timestamps are stored in UTC, eliminating timezone confusion
2. **Clarity**: Database queries and logs now show explicit UTC timestamps
3. **Compatibility**: Works seamlessly with different server/client timezones
4. **Debugging**: Easier to correlate events across different timezone contexts

## Reading Timestamps

### In Database Queries
All timestamps in the database are now in UTC. When you query the database directly (e.g., via pgAdmin or VS Code), you'll see times like:
```
2025-07-03 14:30:45.123456+00
```

The `+00` indicates UTC timezone.

### In Application Logs
The NodeSchedulerService now includes timezone information in health check logs:
```
Node node-1 missed heartbeat, marking as OFFLINE (Last heartbeat: 2025-07-03T14:28:45.123456Z UTC)
```

### Converting to Your Local Time
To convert UTC timestamps to your local timezone:

**For EST (UTC-5):**
```
UTC Time: 2025-07-03 14:30:45
EST Time: 2025-07-03 09:30:45
```

**For PST (UTC-8):**
```
UTC Time: 2025-07-03 14:30:45
PST Time: 2025-07-03 06:30:45
```

## Health Check Intervals

The heartbeat system operates with these intervals (all in UTC):
- **Host Agent**: Sends heartbeat every 60 seconds
- **Orchestrator**: Checks node health every 2 minutes
- **Timeout**: Nodes marked OFFLINE after 3 minutes of missed heartbeats

## Database Schema Impact

The timezone configuration requires no schema changes. Existing `LocalDateTime` columns automatically work with `ZonedDateTime` when the Hibernate timezone is configured.

## Configuration Verification

To verify the timezone configuration is working:

1. **Check Application Logs**: Look for UTC timestamps in heartbeat logs
2. **Database Query**: Query node heartbeats and verify UTC timezone
3. **Time Consistency**: Ensure all timestamps are in UTC across different services

Example verification query:
```sql
SELECT node_id, last_heartbeat, created_at 
FROM nodes 
WHERE status = 'ONLINE' 
ORDER BY last_heartbeat DESC;
```

Results should show timestamps with UTC timezone offset (+00).
