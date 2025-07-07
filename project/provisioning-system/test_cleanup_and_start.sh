#!/bin/bash

# Test script for cleaning up and starting a server that's in ERROR state
# This will clean up any leftover containers/tunnels and restart cleanly

set -e

# Configuration
SERVER_ID="srv_efand_dcb589c8"
JWT_TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlZmFuZCIsImlhdCI6MTc1MTc3NjE2MSwiZXhwIjoxNzUxODYyNTYxfQ.cKkY1cyUu6EiFIj_Tr3K_KCwMMEKK7nl7dnsgsKGPbA"
ORCHESTRATOR_URL="http://localhost:8080"
HOST_AGENT_URL="http://localhost:8082"
RATHOLE_URL="http://localhost:7001"

echo "=== CLEANUP AND START SERVER TEST ==="
echo "Server ID: $SERVER_ID"
echo "JWT Token: Bearer ${JWT_TOKEN:0:20}..."
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

echo "1. Getting current server status..."
SERVER_STATUS=$(make_api_call "GET" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status")
if echo "$SERVER_STATUS" | grep -q '"serverId"'; then
    CURRENT_STATUS=$(echo "$SERVER_STATUS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    echo "✓ Server found in orchestrator"
    echo "  Current Status: $CURRENT_STATUS"
else
    echo "✗ Server not found in orchestrator!"
    echo "Response: $SERVER_STATUS"
    exit 1
fi
echo ""

echo "2. Cleaning up any existing container on host agent..."
# Try to stop the container if it exists
STOP_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"serverId\":\"$SERVER_ID\"}" \
    "$HOST_AGENT_URL/api/containers/stop" || echo '{"error":"failed"}')

echo "  Stop container response: $STOP_RESPONSE"
echo ""

echo "3. Cleaning up any existing tunnel..."
# Try to stop rathole client if it exists
RATHOLE_STOP_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $JWT_TOKEN" \
    "$HOST_AGENT_URL/api/rathole/clients/$SERVER_ID/stop" || echo '{"error":"failed"}')

echo "  Stop rathole client response: $RATHOLE_STOP_RESPONSE"
echo ""

echo "4. Waiting for cleanup to complete..."
sleep 5
echo ""

echo "5. 🚀 STARTING SERVER FROM CLEAN STATE..."
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

echo "6. Monitoring server startup progress..."
echo "   Waiting for asynchronous startup to complete..."

for i in {1..20}; do
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
            
            # Try to get more details from host agent
            echo ""
            echo "Getting details from host agent..."
            CONTAINER_STATUS=$(curl -s -X GET \
                -H "Authorization: Bearer $JWT_TOKEN" \
                "$HOST_AGENT_URL/api/containers/$SERVER_ID/status" || echo '{"error":"failed"}')
            echo "Host agent response: $CONTAINER_STATUS"
            exit 1
        fi
    else
        echo "   Status check $i: Unable to get status"
    fi
    
    if [ $i -eq 20 ]; then
        echo "⚠️  Server didn't reach RUNNING status within 60 seconds"
        echo "   Final status: $CURRENT_STATUS"
        
        # Get final details
        echo ""
        echo "Getting final details from host agent..."
        CONTAINER_STATUS=$(curl -s -X GET \
            -H "Authorization: Bearer $JWT_TOKEN" \
            "$HOST_AGENT_URL/api/containers/$SERVER_ID/status" || echo '{"error":"failed"}')
        echo "Host agent response: $CONTAINER_STATUS"
    fi
done
echo ""

echo "7. Final verification..."
FINAL_STATUS=$(make_api_call "GET" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status")

if echo "$FINAL_STATUS" | grep -q '"status"'; then
    FINAL_STATE=$(echo "$FINAL_STATUS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    echo "✓ Final server status: $FINAL_STATE"
    
    if [ "$FINAL_STATE" = "RUNNING" ]; then
        # Check container status
        echo ""
        echo "Verifying container is running..."
        CONTAINER_STATUS=$(curl -s -X GET \
            -H "Authorization: Bearer $JWT_TOKEN" \
            "$HOST_AGENT_URL/api/containers/$SERVER_ID/status" || echo '{"error":"failed"}')
        
        if echo "$CONTAINER_STATUS" | grep -q '"status":"running"'; then
            echo "✓ Container is running on host agent"
            
            # Check tunnel status
            echo ""
            echo "Verifying tunnel is active..."
            TUNNEL_STATUS=$(curl -s -X GET \
                -H "Authorization: Bearer $JWT_TOKEN" \
                "$RATHOLE_URL/api/instances/$SERVER_ID" || echo '{"error":"failed"}')
            
            if echo "$TUNNEL_STATUS" | grep -q '"status":"success"'; then
                echo "✓ Rathole tunnel is active"
                
                if echo "$TUNNEL_STATUS" | grep -q '"tunnel_game_port"'; then
                    TUNNEL_GAME_PORT=$(echo "$TUNNEL_STATUS" | grep -o '"tunnel_game_port":[0-9]*' | cut -d':' -f2)
                    echo ""
                    echo "🎮 PUBLIC CONNECTION INFO:"
                    echo "  Game Address: 127.0.0.1:$TUNNEL_GAME_PORT"
                    echo "  (Players can connect to this address)"
                fi
            else
                echo "⚠️  Tunnel check failed: $TUNNEL_STATUS"
            fi
        else
            echo "⚠️  Container check failed: $CONTAINER_STATUS"
        fi
        
        echo ""
        echo "=== CLEANUP AND START TEST COMPLETE ==="
        echo "🎉 Server successfully started from clean state!"
    else
        echo ""
        echo "⚠️  Server is not in RUNNING state: $FINAL_STATE"
    fi
else
    echo "✗ Unable to get final server status"
fi
echo ""
