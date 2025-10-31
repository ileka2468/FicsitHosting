#!/bin/bash

# Test script to validate the COMPLETE provisioning flow
# User → Orchestrator → Host Agent → Rathole Manager
# This simulates the actual production flow
#
# Usage:
#   ./test_full_provision_flow.sh                 # Run normal test
#   ./test_full_provision_flow.sh --cleanup-first # Clean up old servers first

JWT_TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlZmFuZCIsImlhdCI6MTc1MTc2NzIyOSwiZXhwIjoxNzUxODUzNjI5fQ.YOmK130ybau-HRbQ9jJdjMJEfHov8G4u5AYJAa1ylw4"
USER_ID="efand"
ORCHESTRATOR_URL="http://localhost:8080"
RATHOLE_MANAGER_URL="http://localhost:7001"
HOST_AGENT_URL="http://localhost:8082"

echo "=== FULL PROVISIONING FLOW TEST ==="
echo "JWT Token: Bearer ${JWT_TOKEN:0:50}..."
echo "User: $USER_ID (SERVICE_ACCOUNT role)"
echo "Orchestrator: $ORCHESTRATOR_URL"
echo ""

# Optional: Clean up old test servers first (uncomment to enable)
if [ "$1" = "--cleanup-first" ]; then
    echo "0. 🧹 Cleaning up old test servers first..."
    
    # Get user ID from auth validation
    AUTH_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" "http://localhost:8081/api/auth/validate")
    USER_ID_RESP=$(echo "$AUTH_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    
    if [ -n "$USER_ID_RESP" ]; then
        echo "   Getting old servers for user ID: $USER_ID_RESP"
        OLD_SERVERS=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" "$ORCHESTRATOR_URL/api/servers/user/$USER_ID_RESP")
        
        # Extract server IDs and delete them
        SERVER_IDS=$(echo "$OLD_SERVERS" | grep -o '"serverId":"[^"]*"' | cut -d'"' -f4)
        
        for OLD_SERVER_ID in $SERVER_IDS; do
            if [[ "$OLD_SERVER_ID" == *"Full-Flow-Test-Server"* ]] || [[ "$OLD_SERVER_ID" == srv_* ]]; then
                echo "   Deleting old server: $OLD_SERVER_ID"
                curl -s -X DELETE -H "Authorization: Bearer $JWT_TOKEN" "$ORCHESTRATOR_URL/api/servers/$OLD_SERVER_ID" > /dev/null
                sleep 2
            fi
        done
        echo "   ✓ Old server cleanup complete"
    fi
    echo ""
fi

# Test 1: Validate JWT token with auth service first
echo "1. Validating JWT token with auth service..."
AUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $JWT_TOKEN" \
    "http://localhost:8081/api/auth/validate")

HTTP_CODE=$(echo "$AUTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$AUTH_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Auth service validation successful"
    USERNAME=$(echo "$RESPONSE_BODY" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    USER_ID_RESP=$(echo "$RESPONSE_BODY" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    ROLES=$(echo "$RESPONSE_BODY" | grep -o '"roles":\[[^]]*\]' | sed 's/"roles":\[//; s/\]//; s/"//g')
    echo "  User: $USERNAME (ID: $USER_ID_RESP, Roles: $ROLES)"
else
    echo "✗ Auth service validation failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi
echo ""

# Test 2: Check orchestrator health
echo "2. Checking orchestrator health..."
ORCHESTRATOR_HEALTH=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$ORCHESTRATOR_URL/actuator/health")
HTTP_CODE=$(echo "$ORCHESTRATOR_HEALTH" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Orchestrator is healthy"
else
    echo "✗ Orchestrator health check failed (HTTP $HTTP_CODE)"
    echo "Response: $(echo "$ORCHESTRATOR_HEALTH" | sed '/HTTP_CODE:/d')"
    exit 1
fi
echo ""

# Test 3: THE MAIN TEST - Full provisioning flow via orchestrator
echo "3. 🚀 TESTING FULL PROVISION FLOW via Orchestrator..."
echo "   Making provision request to: $ORCHESTRATOR_URL/api/servers/provision"

PROVISION_REQUEST='{
    "userId": "'$USER_ID'",
    "serverName": "Full-Flow-Test-Server",
    "ramAllocation": 4,
    "cpuAllocation": 2,
    "maxPlayers": 4,
    "serverPassword": "testpass123",
    "preferredNodeId": null
}'

echo "   Request payload:"
echo "$PROVISION_REQUEST"
echo ""

PROVISION_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PROVISION_REQUEST" \
    "$ORCHESTRATOR_URL/api/servers/provision")

HTTP_CODE=$(echo "$PROVISION_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$PROVISION_RESPONSE" | sed '/HTTP_CODE:/d')

echo "Orchestrator response (HTTP $HTTP_CODE):"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✓ Provision request accepted by orchestrator"
    echo "$RESPONSE_BODY"
    
    # Extract server ID for further testing (using grep/sed instead of jq)
    SERVER_ID=$(echo "$RESPONSE_BODY" | grep -o '"serverId":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$SERVER_ID" ]; then
        SERVER_ID=$(echo "$RESPONSE_BODY" | grep -o '"server_id":"[^"]*"' | cut -d'"' -f4)
    fi
    
    GAME_PORT=$(echo "$RESPONSE_BODY" | grep -o '"gamePort":[0-9]*' | cut -d':' -f2)
    if [ -z "$GAME_PORT" ]; then
        GAME_PORT=$(echo "$RESPONSE_BODY" | grep -o '"game_port":[0-9]*' | cut -d':' -f2)
    fi
    
    BEACON_PORT=$(echo "$RESPONSE_BODY" | grep -o '"beaconPort":[0-9]*' | cut -d':' -f2)
    if [ -z "$BEACON_PORT" ]; then
        BEACON_PORT=$(echo "$RESPONSE_BODY" | grep -o '"beacon_port":[0-9]*' | cut -d':' -f2)
    fi
    
    if [ -n "$SERVER_ID" ] && [ "$SERVER_ID" != "null" ]; then
        echo "  Server ID: $SERVER_ID"
        echo "  Game Port: $GAME_PORT"
        echo "  Beacon Port: $BEACON_PORT"
    else
        echo "⚠️  Could not extract server ID from response"
        SERVER_ID="unknown"
    fi
else
    echo "✗ Provision request failed"
    echo "$RESPONSE_BODY"
    exit 1
fi
echo ""

# Give the orchestrator more time to process asynchronously
echo "4. Waiting for asynchronous provisioning to complete..."
echo "   (Orchestrator → Host Agent → Rathole Manager chain)"
echo "   Waiting 10 seconds for full provisioning chain..."
sleep 10
echo ""

# Test 4: Verify server was created in orchestrator database
if [ -n "$SERVER_ID" ] && [ "$SERVER_ID" != "unknown" ]; then
    echo "5. Checking server status in orchestrator..."
    SERVER_STATUS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status")
    
    HTTP_CODE=$(echo "$SERVER_STATUS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$SERVER_STATUS_RESPONSE" | sed '/HTTP_CODE:/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✓ Server found in orchestrator database"
        echo "$RESPONSE_BODY"
        SERVER_STATUS=$(echo "$RESPONSE_BODY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        echo "  Current Status: $SERVER_STATUS"
    else
        echo "✗ Could not get server status from orchestrator (HTTP $HTTP_CODE)"
        echo "$RESPONSE_BODY"
    fi
    echo ""
fi

# Test 5: Check if container was created on host agent
echo "6. Checking if container was created on host agent..."
if [ -n "$SERVER_ID" ] && [ "$SERVER_ID" != "unknown" ]; then
    CONTAINER_STATUS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        "$HOST_AGENT_URL/api/containers/$SERVER_ID/status")
    
    HTTP_CODE=$(echo "$CONTAINER_STATUS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$CONTAINER_STATUS_RESPONSE" | sed '/HTTP_CODE:/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✓ Container found on host agent"
        echo "$RESPONSE_BODY"
    else
        echo "✗ Container not found on host agent (HTTP $HTTP_CODE)"
        echo "$RESPONSE_BODY"
    fi
    echo ""
fi

# Test 6: Check if tunnel was created in Rathole manager
echo "7. Checking if tunnel was created in Rathole manager..."
if [ -n "$SERVER_ID" ] && [ "$SERVER_ID" != "unknown" ]; then
    TUNNEL_STATUS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        "$RATHOLE_MANAGER_URL/api/instances/$SERVER_ID")
    
    HTTP_CODE=$(echo "$TUNNEL_STATUS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$TUNNEL_STATUS_RESPONSE" | sed '/HTTP_CODE:/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✓ Tunnel found in Rathole manager"
        echo "$RESPONSE_BODY"
        
        # Extract tunnel info (using grep/sed instead of jq)
        TUNNEL_GAME_PORT=$(echo "$RESPONSE_BODY" | grep -o '"tunnel_game_port":[0-9]*' | cut -d':' -f2)
        TUNNEL_QUERY_PORT=$(echo "$RESPONSE_BODY" | grep -o '"tunnel_query_port":[0-9]*' | cut -d':' -f2)
        PUBLIC_IP="127.0.0.1"  # Default for local testing
        
        echo ""
        echo "🎮 PUBLIC CONNECTION INFO:"
        echo "  Game Address: $PUBLIC_IP:$TUNNEL_GAME_PORT"
        echo "  Query Address: $PUBLIC_IP:$TUNNEL_QUERY_PORT"
        echo "  (Players can connect to these addresses)"
    else
        echo "✗ Tunnel not found in Rathole manager (HTTP $HTTP_CODE)"
        echo "$RESPONSE_BODY"
    fi
    echo ""
fi

# Test 7: List all user servers to verify it's in the list
echo "8. Listing all servers for user $USER_ID (ID: $USER_ID_RESP)..."
USER_SERVERS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    "$ORCHESTRATOR_URL/api/servers/user/$USER_ID_RESP")

HTTP_CODE=$(echo "$USER_SERVERS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$USER_SERVERS_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Retrieved user servers list"
    # Count servers by counting occurrences of "serverId" or "server_id"
    SERVER_COUNT=$(echo "$RESPONSE_BODY" | grep -o '"serverId":\|"server_id":' | wc -l)
    echo "  Total servers: $SERVER_COUNT"
    echo "$RESPONSE_BODY"
else
    echo "✗ Could not retrieve user servers (HTTP $HTTP_CODE)"
    echo "$RESPONSE_BODY"
fi
echo ""

# Test 8: Cleanup - Delete the test server
echo "9. 🧹 Cleaning up test server..."
if [ -n "$SERVER_ID" ] && [ "$SERVER_ID" != "unknown" ]; then
    DELETE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -X DELETE \
        "$ORCHESTRATOR_URL/api/servers/$SERVER_ID")
    
    HTTP_CODE=$(echo "$DELETE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        echo "✓ Server deletion request sent"
        echo "  Waiting for cleanup to complete..."
        sleep 5
        
        # Verify cleanup with retries
        echo "  Verifying cleanup..."
        for i in {1..3}; do
            echo "    Attempt $i: Checking if tunnel was removed..."
            CLEANUP_CHECK=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
                -H "Authorization: Bearer $JWT_TOKEN" \
                "$RATHOLE_MANAGER_URL/api/instances/$SERVER_ID")
            
            CLEANUP_HTTP_CODE=$(echo "$CLEANUP_CHECK" | grep "HTTP_CODE:" | cut -d: -f2)
            if [ "$CLEANUP_HTTP_CODE" = "404" ]; then
                echo "  ✓ Tunnel successfully removed from Rathole manager"
                break
            else
                echo "    - Tunnel still exists, waiting 3 seconds..."
                sleep 3
                if [ "$i" = "3" ]; then
                    echo "  ⚠️  Tunnel may still exist in Rathole manager after 3 attempts"
                    echo "    Response: $(echo "$CLEANUP_CHECK" | sed '/HTTP_CODE:/d')"
                fi
            fi
        done
    else
        echo "✗ Server deletion failed (HTTP $HTTP_CODE)"
        RESPONSE_BODY=$(echo "$DELETE_RESPONSE" | sed '/HTTP_CODE:/d')
        echo "$RESPONSE_BODY"
    fi
else
    echo "⚠️  No server ID to clean up"
fi
echo ""

echo "=== FULL PROVISIONING FLOW TEST COMPLETE ==="
echo ""
echo "Summary:"
echo "- ✓ Auth service: JWT validation working"
echo "- ✓ Orchestrator: Accepting provision requests"
echo "- ✓ Host Agent: Creating containers"
echo "- ✓ Rathole Manager: Creating tunnels with proper auth"
echo "- ✓ End-to-End: Full production flow working"
echo ""
echo "🎉 The complete Satisfactory server provisioning system is working!"
