#!/bin/bash

# Test script to validate the full authentication flow
# Orchestrator → Host Agent → Rathole Manager

JWT_TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlZmFuZCIsImlhdCI6MTc1MTY3ODc1OSwiZXhwIjoxNzUxNzY1MTU5fQ.oKMDQTo40H-FC7gvajnKWx2VFbXIsEwnlqjISgSJTRI"
USER_ID="efand"

echo "=== Testing Authentication Flow ==="
echo "JWT Token: Bearer ${JWT_TOKEN:0:50}..."
echo "User: $USER_ID"
echo ""

# Test 1: Validate JWT token with auth service
echo "1. Testing auth service JWT validation..."
AUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $JWT_TOKEN" \
    "http://localhost:8081/api/auth/validate")

HTTP_CODE=$(echo "$AUTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$AUTH_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Auth service validation successful"
    echo "User info: $RESPONSE_BODY"
else
    echo "✗ Auth service validation failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi
echo ""

# Test 2: Test Rathole manager direct access (should fail without token)
echo "2. Testing Rathole manager without token (should fail)..."
RATHOLE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Content-Type: application/json" \
    -d '{"server_id":"test-srv-123","game_port":15777,"query_port":15778}' \
    "http://localhost:7001/api/instances")

HTTP_CODE=$(echo "$RATHOLE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "✓ Rathole manager correctly rejected request without token"
else
    echo "✗ Rathole manager should have rejected request without token (got HTTP $HTTP_CODE)"
fi
echo ""

# Test 3: Test Rathole manager with JWT token
echo "3. Testing Rathole manager with JWT token..."
RATHOLE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"server_id":"test-srv-456","game_port":15779,"query_port":15780}' \
    "http://localhost:7001/api/instances")

HTTP_CODE=$(echo "$RATHOLE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RATHOLE_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Rathole manager accepted JWT token"
    echo "Response: $RESPONSE_BODY"
    
    # Clean up the test instance
    echo "Cleaning up test instance..."
    curl -s -H "Authorization: Bearer $JWT_TOKEN" \
        -X DELETE "http://localhost:7001/api/instances/test-srv-456" > /dev/null
else
    echo "✗ Rathole manager rejected JWT token (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi
echo ""

# Test 4: Test host agent with JWT token (simulate orchestrator call)
echo "4. Testing host agent JWT forwarding..."
HOST_AGENT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "serverId": "test-srv-789",
        "serverName": "Test Server",
        "gamePort": 15781,
        "beaconPort": 15782,
        "ramAllocation": 4,
        "cpuAllocation": 2,
        "maxPlayers": 4,
        "environmentVariables": {}
    }' \
    "http://localhost:8082/api/containers/spawn")

HTTP_CODE=$(echo "$HOST_AGENT_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$HOST_AGENT_RESPONSE" | sed '/HTTP_CODE:/d')

echo "Host agent response (HTTP $HTTP_CODE):"
echo "$RESPONSE_BODY"
echo ""

# Test 5: Check if tunnel was created in Rathole manager
if [ "$HTTP_CODE" = "200" ]; then
    echo "5. Checking if tunnel was created in Rathole manager..."
    TUNNEL_CHECK=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        "http://localhost:7001/api/instances/test-srv-789")
    
    TUNNEL_HTTP_CODE=$(echo "$TUNNEL_CHECK" | grep "HTTP_CODE:" | cut -d: -f2)
    TUNNEL_RESPONSE=$(echo "$TUNNEL_CHECK" | sed '/HTTP_CODE:/d')
    
    if [ "$TUNNEL_HTTP_CODE" = "200" ]; then
        echo "✓ Tunnel successfully created via host agent"
        echo "Tunnel info: $TUNNEL_RESPONSE"
        
        # Clean up
        echo "Cleaning up..."
        curl -s -H "Authorization: Bearer $JWT_TOKEN" \
            -X DELETE "http://localhost:7001/api/instances/test-srv-789" > /dev/null
        curl -s -H "Content-Type: application/json" \
            -d '{"serverId":"test-srv-789"}' \
            "http://localhost:8082/api/containers/stop" > /dev/null
    else
        echo "✗ Tunnel not found in Rathole manager (HTTP $TUNNEL_HTTP_CODE)"
        echo "Response: $TUNNEL_RESPONSE"
    fi
else
    echo "5. Skipping tunnel check due to host agent failure"
fi

echo ""
echo "=== Test Complete ==="
