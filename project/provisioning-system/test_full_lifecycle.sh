#!/bin/bash

# Test script for preparing a server in STOPPED state for start testing
# This will provision a new server and stop it, leaving it ready for start testing

set -e

# Configuration - using your fresh token
JWT_TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlZmFuZCIsImlhdCI6MTc1MTc3NjgwMCwiZXhwIjoxNzUxODYzMjAwfQ.qbrQMhOHNuelHsJhhwsfsMLAW-9fETVGlU6peVgwSPk"
ORCHESTRATOR_URL="http://localhost:8080"
AUTH_SERVICE_URL="http://localhost:8081"
HOST_AGENT_URL="http://localhost:8082"
RATHOLE_URL="http://localhost:7001"

echo "=== PREPARE SERVER IN STOPPED STATE FOR START TESTING ==="
echo "JWT Token: Bearer ${JWT_TOKEN:0:20}..."
echo "This will: provision → stop → leave ready for start testing"
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
echo "1. Validating JWT token..."
AUTH_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $JWT_TOKEN" \
    "$AUTH_SERVICE_URL/api/auth/validate" || echo '{"error":"failed"}')

if echo "$AUTH_RESPONSE" | grep -q '"username"'; then
    USER=$(echo "$AUTH_RESPONSE" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$AUTH_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo "✓ Auth service validation successful"
    echo "  User: $USER (ID: $USER_ID)"
else
    echo "✗ JWT token validation failed!"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi
echo ""

# 2. Provision a new server
echo "2. 🏗️  PROVISIONING NEW SERVER..."
PROVISION_PAYLOAD='{
    "userId": "efand",
    "serverName": "Start-Stop-Test-Server",
    "ramAllocation": 4,
    "cpuAllocation": 2,
    "maxPlayers": 4,
    "serverPassword": "testpass123",
    "preferredNodeId": null
}'

PROVISION_RESPONSE=$(make_api_call "POST" "$ORCHESTRATOR_URL/api/servers/provision" "$PROVISION_PAYLOAD")
echo "Provision response:"
echo "$PROVISION_RESPONSE" | jq '.' 2>/dev/null || echo "$PROVISION_RESPONSE"

if echo "$PROVISION_RESPONSE" | grep -q '"serverId"'; then
    SERVER_ID=$(echo "$PROVISION_RESPONSE" | grep -o '"serverId":"[^"]*"' | cut -d'"' -f4)
    echo "✓ Server provisioning initiated"
    echo "  Server ID: $SERVER_ID"
else
    echo "✗ Failed to provision server!"
    exit 1
fi
echo ""

# 3. Wait for provisioning to complete
echo "3. ⏳ Waiting for provisioning to complete..."
for i in {1..15}; do
    sleep 3
    STATUS_CHECK=$(make_api_call "GET" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status")
    
    if echo "$STATUS_CHECK" | grep -q '"status"'; then
        CURRENT_STATUS=$(echo "$STATUS_CHECK" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        echo "   Provision check $i: $CURRENT_STATUS"
        
        if [ "$CURRENT_STATUS" = "RUNNING" ]; then
            echo "✓ Server successfully provisioned and running!"
            break
        elif [ "$CURRENT_STATUS" = "ERROR" ]; then
            echo "✗ Server provisioning failed!"
            exit 1
        fi
    fi
    
    if [ $i -eq 15 ]; then
        echo "⚠️  Server didn't reach RUNNING status within 45 seconds"
        echo "   Current status: $CURRENT_STATUS"
        exit 1
    fi
done
echo ""

# 4. Stop the server (so we can test starting it later)
echo "4. 🛑 STOPPING SERVER TO TEST START FUNCTIONALITY..."
STOP_RESPONSE=$(make_api_call "POST" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/stop")
echo "Stop response:"
echo "$STOP_RESPONSE" | jq '.' 2>/dev/null || echo "$STOP_RESPONSE"

echo "✓ Stop request sent"
echo ""

# 5. Wait for stop to complete
echo "5. ⏳ Waiting for server to stop..."
for i in {1..10}; do
    sleep 3
    STATUS_CHECK=$(make_api_call "GET" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status")
    
    if echo "$STATUS_CHECK" | grep -q '"status"'; then
        CURRENT_STATUS=$(echo "$STATUS_CHECK" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        echo "   Stop check $i: $CURRENT_STATUS"
        
        if [ "$CURRENT_STATUS" = "STOPPED" ]; then
            echo "✓ Server successfully stopped!"
            break
        fi
    fi
    
    if [ $i -eq 10 ]; then
        echo "⚠️  Server didn't reach STOPPED status within 30 seconds"
        echo "   Current status: $CURRENT_STATUS"
    fi
done
echo ""

# 6. Verify server is in STOPPED state and ready for start testing
echo "6. ✅ VERIFYING SERVER IS READY FOR START TESTING..."
FINAL_STATUS=$(make_api_call "GET" "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status")

if echo "$FINAL_STATUS" | grep -q '"status"'; then
    FINAL_STATE=$(echo "$FINAL_STATUS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    echo "✓ Current server status: $FINAL_STATE"
    
    if [ "$FINAL_STATE" = "STOPPED" ]; then
        echo ""
        echo "=== SERVER READY FOR START TESTING ==="
        echo ""
        echo "Summary:"
        echo "- ✓ Server provisioned successfully"
        echo "- ✓ Server stopped successfully" 
        echo "- ✓ Server is in STOPPED state"
        echo ""
        echo "🎯 Server is now ready for start testing!"
        echo ""
        echo "Server details:"
        echo "- Server ID: $SERVER_ID"
        echo "- Status: $FINAL_STATE"
        echo "- Game Port: 30000"
        echo "- Beacon Port: 30001"
        echo ""
        echo "To test starting this server, use:"
        echo "curl -X POST -H \"Authorization: Bearer $JWT_TOKEN\" \"$ORCHESTRATOR_URL/api/servers/$SERVER_ID/start\""
        echo ""
        echo "To check status:"
        echo "curl -X GET -H \"Authorization: Bearer $JWT_TOKEN\" \"$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status\""
        echo ""
        echo "To delete when done testing:"
        echo "curl -X DELETE -H \"Authorization: Bearer $JWT_TOKEN\" \"$ORCHESTRATOR_URL/api/servers/$SERVER_ID\""
    else
        echo ""
        echo "⚠️  Server is not in STOPPED state: $FINAL_STATE"
        echo "   You may need to manually stop it before testing start functionality"
    fi
else
    echo "✗ Unable to get final server status"
fi
echo ""
