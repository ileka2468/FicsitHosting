#!/bin/bash

# Test script using the provided JWT token
# Updated to use correct orchestrator endpoints matching the working test script

TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlZmFuZCIsImlhdCI6MTc1MTc2NzIyOSwiZXhwIjoxNzUxODUzNjI5fQ.YOmK130ybau-HRbQ9jJdjMJEfHov8G4u5AYJAa1ylw4"
ORCHESTRATOR_URL="http://localhost:8080"
SERVER_NAME="test-fixed-auth"

echo "🧪 Testing Satisfactory Server Provisioning with Updated Token"
echo "================================================="
echo "Token: ${TOKEN:0:50}..."
echo "Server Name: $SERVER_NAME"
echo ""

# First, validate the token and get user info
echo "Step 0: Validating JWT token with auth service..."
AUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" \
    "http://localhost:8081/api/auth/validate")

HTTP_CODE=$(echo "$AUTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$AUTH_RESPONSE" | sed '/HTTP_CODE:/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Auth service validation successful"
    USERNAME=$(echo "$RESPONSE_BODY" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[0-9]*' | cut -d':' -f2)
    echo "  User: $USERNAME (ID: $USER_ID)"
else
    echo "✗ Auth service validation failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi
echo ""

# Cleanup any existing servers for this user first
echo "🧹 Cleaning up any existing test servers..."
if [ -n "$USER_ID" ]; then
    OLD_SERVERS=$(curl -s -H "Authorization: Bearer $TOKEN" "$ORCHESTRATOR_URL/api/servers/user/$USER_ID")
    SERVER_IDS=$(echo "$OLD_SERVERS" | grep -o '"serverId":"[^"]*"' | cut -d'"' -f4)
    
    for OLD_SERVER_ID in $SERVER_IDS; do
        if [[ "$OLD_SERVER_ID" == *"test-fixed-auth"* ]] || [[ "$OLD_SERVER_ID" == srv_* ]]; then
            echo "   Deleting old server: $OLD_SERVER_ID"
            curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "$ORCHESTRATOR_URL/api/servers/$OLD_SERVER_ID" > /dev/null
            sleep 2
        fi
    done
fi
echo ""

echo "✅ Step 1: Provision a new Satisfactory server"
PROVISION_REQUEST='{
    "userId": "'$USERNAME'",
    "serverName": "'$SERVER_NAME'",
    "ramAllocation": 4,
    "cpuAllocation": 2,
    "maxPlayers": 4,
    "serverPassword": "testpass123",
    "preferredNodeId": null
}'

echo "Request payload:"
echo "$PROVISION_REQUEST"
echo ""

PROVISION_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PROVISION_REQUEST" \
  "$ORCHESTRATOR_URL/api/servers/provision")

HTTP_CODE=$(echo "$PROVISION_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$PROVISION_RESPONSE" | sed '/HTTP_CODE:/d')

echo "Orchestrator response (HTTP $HTTP_CODE):"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✓ Provision request accepted"
    echo "$RESPONSE_BODY"
    
    # Extract server ID for further testing
    SERVER_ID=$(echo "$RESPONSE_BODY" | grep -o '"serverId":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$SERVER_ID" ]; then
        SERVER_ID=$(echo "$RESPONSE_BODY" | grep -o '"server_id":"[^"]*"' | cut -d'"' -f4)
    fi
    
    if [ -n "$SERVER_ID" ] && [ "$SERVER_ID" != "null" ]; then
        echo "  Server ID: $SERVER_ID"
    else
        echo "⚠️  Could not extract server ID from response"
        SERVER_ID=""
    fi
else
    echo "❌ Provisioning failed!"
    echo "$RESPONSE_BODY"
    exit 1
fi

echo ""
echo "⏳ Waiting for server to be fully provisioned..."
sleep 10

echo ""
echo "✅ Step 2: Check server status"
if [ -n "$SERVER_ID" ]; then
    STATUS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -H "Authorization: Bearer $TOKEN" \
      "$ORCHESTRATOR_URL/api/servers/$SERVER_ID/status")
    
    HTTP_CODE=$(echo "$STATUS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$STATUS_RESPONSE" | sed '/HTTP_CODE:/d')
    
    echo "Server Status (HTTP $HTTP_CODE): $RESPONSE_BODY"
else
    echo "⚠️  No server ID available, skipping status check"
fi

echo ""
echo "✅ Step 3: List all servers for user"
LIST_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$ORCHESTRATOR_URL/api/servers/user/$USER_ID")

HTTP_CODE=$(echo "$LIST_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LIST_RESPONSE" | sed '/HTTP_CODE:/d')

echo "All User Servers (HTTP $HTTP_CODE): $RESPONSE_BODY"

echo ""
echo "✅ Step 4: Delete the server (this tests tunnel cleanup)"
if [ -n "$SERVER_ID" ]; then
    DELETE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -H "Authorization: Bearer $TOKEN" \
      -X DELETE \
      "$ORCHESTRATOR_URL/api/servers/$SERVER_ID")
    
    HTTP_CODE=$(echo "$DELETE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$DELETE_RESPONSE" | sed '/HTTP_CODE:/d')
    
    echo "Delete Response (HTTP $HTTP_CODE): $RESPONSE_BODY"
else
    echo "⚠️  No server ID available, skipping deletion"
fi

echo ""
echo "⏳ Waiting for cleanup to complete..."
sleep 5

echo ""
echo "✅ Step 5: Verify server is deleted"
if [ -n "$SERVER_ID" ]; then
    FINAL_CHECK=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      -H "Authorization: Bearer $TOKEN" \
      "$ORCHESTRATOR_URL/api/servers/$SERVER_ID")
    
    HTTP_CODE=$(echo "$FINAL_CHECK" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$FINAL_CHECK" | sed '/HTTP_CODE:/d')
    
    echo "Final Check (HTTP $HTTP_CODE): $RESPONSE_BODY"
    
    if [ "$HTTP_CODE" = "404" ]; then
        echo "✓ Server successfully deleted"
    else
        echo "⚠️  Server may still exist"
    fi
else
    echo "⚠️  No server ID available, skipping final check"
fi

echo ""
echo "🎉 Test completed!"
echo "Check the orchestrator logs to verify tunnel creation and cleanup worked properly."
