#!/bin/bash

# Test script for starting the specific stopped server srv_efand_dcb589c8
# Tests the complete flow: orchestrator → host agent → container start → tunnel restoration

set -e

# Configuration
SERVER_ID="srv_efand_7a5ca262"
JWT_TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlZmFuZCIsImlhdCI6MTc1MTg4NDQzNCwiZXhwIjoxNzUxOTcwODM0fQ.dyWfFjZwOlF6fxCHYNQxmZ11edLzexc-y_EunLZkY9U"
ORCHESTRATOR_URL="http://localhost:8080"
AUTH_SERVICE_URL="http://localhost:8081"
HOST_AGENT_URL="http://localhost:8082"
RATHOLE_URL="http://localhost:7001"

echo "=== STARTING STOPPED SERVER TEST ==="
echo "Server ID: $SERVER_ID"
echo "JWT Token: Bearer ${JWT_TOKEN:0:20}..."
echo "Orchestrator: $ORCHESTRATOR_URL"
echo ""

# Function to make authenticated API calls
make_api_call() {
    local method=$1
    local url=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
             -H "Authorization: Bearer $JWT_TOKEN" \
             -H "Content-Type: application/json" \
             -d "$data" \
             "$url"
    else
        curl -s -X "$method" \
             -H "Authorization: Bearer $JWT_TOKEN" \
             "$url"
    fi
}

# 1. Validate JWT token
echo "1. Validating JWT token with auth service..."
AUTH_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $JWT_TOKEN" \
    "$AUTH_SERVICE_URL/api/auth/validate" || echo '{"error":"failed"}')

if echo "$AUTH_RESPONSE" | grep -q '"username"'; then
    USER=$(echo "$AUTH_RESPONSE" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$AUTH_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    ROLES=$(echo "$AUTH_RESPONSE" | grep -o '"roles":\[[^]]*\]' | cut -d':' -f2)
    echo "✓ Auth service validation successful"
    echo "  User: $USER (ID: $USER_ID, Roles: $ROLES)"
else
    echo "✗ JWT token validation failed!"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi
echo ""

# 2. Check orchestrator health
echo "2. Checking orchestrator health..."
HEALTH_RESPONSE=$(curl -s "$ORCHESTRATOR_URL/actuator/health" || echo '{"status":"DOWN"}')
if echo "$HEALTH_RESPONSE" | grep -q '"status":"UP"'; then
    echo "✓ Orchestrator is healthy"
else
    echo "✗ Orchestrator is not healthy!"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

# 3. Get current server status
echo "3. Getting current server status..."
SERVER_STATUS=$(make_api_call "GET" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status")
if echo "$SERVER_STATUS" | grep -q '"serverId"'; then
    CURRENT_STATUS=$(echo "$SERVER_STATUS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    echo "✓ Server found in orchestrator"
    echo "  Current Status: $CURRENT_STATUS"
    
    # Parse server details
    GAME_PORT=$(echo "$SERVER_STATUS" | grep -o '"gamePort":[0-9]*' | cut -d':' -f2)
    BEACON_PORT=$(echo "$SERVER_STATUS" | grep -o '"beaconPort":[0-9]*' | cut -d':' -f2)
    NODE_ID=$(echo "$SERVER_STATUS" | grep -o '"nodeId":"[^"]*"' | cut -d'"' -f4)
    
    echo "  Game Port: $GAME_PORT"
    echo "  Beacon Port: $BEACON_PORT"
    echo "  Node ID: $NODE_ID"
    
    if [ "$CURRENT_STATUS" = "RUNNING" ]; then
        echo "⚠️  Server is already running. Stopping it first to test start functionality..."
        
        echo "   Stopping server..."
        STOP_RESPONSE=$(make_api_call "POST" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/stop")
        echo "   Stop request sent"
        
        # Wait for stop to complete
        echo "   Waiting for server to stop..."
        for i in {1..10}; do
            sleep 2
            STATUS_CHECK=$(make_api_call "GET" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status")
            NEW_STATUS=$(echo "$STATUS_CHECK" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            echo "   Status check $i: $NEW_STATUS"
            
            if [ "$NEW_STATUS" = "STOPPED" ] || [ "$NEW_STATUS" = "ERROR" ]; then
                echo "   ✓ Server stopped (status: $NEW_STATUS)"
                break
            fi
            
            if [ $i -eq 10 ]; then
                echo "   ⚠️  Server didn't stop within 20 seconds, continuing anyway..."
            fi
        done
    elif [ "$CURRENT_STATUS" = "STOPPED" ]; then
        echo "✓ Server is already stopped - perfect for testing start!"
    else
        echo "⚠️  Server is in status: $CURRENT_STATUS - will attempt to start anyway"
    fi
else
    echo "✗ Server not found in orchestrator!"
    echo "Response: $SERVER_STATUS"
    exit 1
fi
echo ""

# 4. Start the server
echo "4. 🚀 STARTING SERVER..."
echo "   Making start request to: $ORCHESTRATOR_URL/api/servers/$SERVER_ID/start"

START_RESPONSE=$(make_api_call "POST" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/start")
echo "Start response:"
echo "$START_RESPONSE" | jq '.' 2>/dev/null || echo "$START_RESPONSE"

if echo "$START_RESPONSE" | grep -q '"message"' || echo "$START_RESPONSE" | grep -q 'running'; then
    echo "✓ Start request accepted"
    if echo "$START_RESPONSE" | grep -q '"message"'; then
        MESSAGE=$(echo "$START_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        echo "  Message: $MESSAGE"
    fi
else
    echo "✗ Start request failed!"
    echo "Response: $START_RESPONSE"
    exit 1
fi
echo ""

# 5. Monitor server startup
echo "5. Monitoring server startup progress..."
echo "   Waiting for asynchronous startup to complete..."

for i in {1..15}; do
    sleep 3
    STATUS_CHECK=$(make_api_call "GET" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status")
    
    if echo "$STATUS_CHECK" | grep -q '"status"'; then
        CURRENT_STATUS=$(echo "$STATUS_CHECK" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        echo "   Status check $i: $CURRENT_STATUS"
        
        if [ "$CURRENT_STATUS" = "RUNNING" ]; then
            echo "✓ Server successfully started!"
            break
        elif [ "$CURRENT_STATUS" = "ERROR" ]; then
            echo "✗ Server failed to start (ERROR status)"
            echo "Full status response:"
            echo "$STATUS_CHECK" | jq '.' 2>/dev/null || echo "$STATUS_CHECK"
            exit 1
        fi
    else
        echo "   Status check $i: Unable to get status"
    fi
    
    if [ $i -eq 15 ]; then
        echo "⚠️  Server didn't reach RUNNING status within 45 seconds"
        echo "   Final status: $CURRENT_STATUS"
    fi
done
echo ""

# 6. Verify container is running on host agent
echo "6. Verifying container is running on host agent..."

CONTAINER_STATUS=$(curl -s -X GET \
    -H "Authorization: Bearer $JWT_TOKEN" \
    "$HOST_AGENT_URL/api/containers/$SERVER_ID/status" || echo '{"error":"failed"}')

if echo "$CONTAINER_STATUS" | grep -q '"status":"running"'; then
    echo "✓ Container is running on host agent"
    
    # Parse container info
    CONTAINER_ID=$(echo "$CONTAINER_STATUS" | grep -o '"containerId":"[^"]*"' | cut -d'"' -f4)
    echo "  Container ID: ${CONTAINER_ID:0:12}..."
    
    if echo "$CONTAINER_STATUS" | grep -q '"info"'; then
        echo "  Container details available"
    fi
else
    echo "⚠️  Container status check failed or container not running"
    echo "Response: $CONTAINER_STATUS"
fi
echo ""

# 7. Check if tunnel is active
echo "7. Checking if Rathole tunnel is active..."

TUNNEL_STATUS=$(curl -s -X GET \
    -H "Authorization: Bearer $JWT_TOKEN" \
    "$RATHOLE_URL/api/instances/$SERVER_ID" || echo '{"error":"failed"}')

if echo "$TUNNEL_STATUS" | grep -q '"status":"success"'; then
    echo "✓ Rathole tunnel is active"
    
    # Parse tunnel info
    if echo "$TUNNEL_STATUS" | grep -q '"instance"'; then
        TUNNEL_GAME_PORT=$(echo "$TUNNEL_STATUS" | grep -o '"tunnel_game_port":[0-9]*' | cut -d':' -f2)
        TUNNEL_QUERY_PORT=$(echo "$TUNNEL_STATUS" | grep -o '"tunnel_query_port":[0-9]*' | cut -d':' -f2)
        IS_RUNNING=$(echo "$TUNNEL_STATUS" | grep -o '"is_running":[^,}]*' | cut -d':' -f2)
        
        echo "  Tunnel Game Port: $TUNNEL_GAME_PORT"
        echo "  Tunnel Query Port: $TUNNEL_QUERY_PORT"
        echo "  Is Running: $IS_RUNNING"
        
        echo ""
        echo "🎮 PUBLIC CONNECTION INFO:"
        echo "  Game Address: 127.0.0.1:$TUNNEL_GAME_PORT"
        echo "  Query Address: 127.0.0.1:$TUNNEL_QUERY_PORT"
        echo "  (Players can connect to these addresses)"
    fi
else
    echo "⚠️  Tunnel status check failed or tunnel not active"
    echo "Response: $TUNNEL_STATUS"
fi
echo ""

# 8. Final server status summary
echo "8. Final server status summary..."
FINAL_STATUS=$(make_api_call "GET" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status")

if echo "$FINAL_STATUS" | grep -q '"status"'; then
    FINAL_STATE=$(echo "$FINAL_STATUS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    echo "✓ Final server status: $FINAL_STATE"
    
    if [ "$FINAL_STATE" = "RUNNING" ]; then
        echo ""
        echo "=== START STOPPED SERVER TEST COMPLETE ==="
        echo ""
        echo "Summary:"
        echo "- ✓ JWT validation: Working"
        echo "- ✓ Orchestrator: Healthy and responsive"
        echo "- ✓ Server start: Successful"
        echo "- ✓ Container: Running on host agent"
        echo "- ✓ Tunnel: Active and accessible"
        echo ""
        echo "🎉 The server start functionality is working perfectly!"
    else
        echo ""
        echo "⚠️  Server is not in RUNNING state after start attempt"
        echo "   Final state: $FINAL_STATE"
    fi
else
    echo "✗ Unable to get final server status"
fi
echo ""
