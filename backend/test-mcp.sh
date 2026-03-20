#!/bin/bash

API_KEY="sk_9e9e21be536fb5800eeeca0142140c7f199062ebe6154acf"
ORG_ID="4nEvK4my318ApynG0qFxMSQu4UOVCehj"
BASE_URL="https://api.revcenter.ai/api/mcp/sse"

echo "=== Testing MCP Connection ==="

echo ""
echo "1. Initialize connection..."
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: $API_KEY" \
  -H "x-organization-id: $ORG_ID" \
  -d '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | jq .

echo ""
echo "2. List tools..."
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: $API_KEY" \
  -H "x-organization-id: $ORG_ID" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[] | {name: .name, description: .description}'

echo ""
echo "3. Call list-services..."
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: $API_KEY" \
  -H "x-organization-id: $ORG_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list-services","arguments":{}}}' | jq .

echo ""
echo "4. Call create-task (test)..."
curl -s -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: $API_KEY" \
  -H "x-organization-id: $ORG_ID" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"create-task",
      "arguments":{
        "serviceId":"c3d0f239-e3c4-4488-902e-fb3f135c4b1a",
        "conversationId":"test-troubleshoot-123",
        "serviceArgs":{
          "name":"Test User",
          "phone-number":"555-555-5555",
          "address":"123 Test St",
          "email-address":"test@test.com",
          "location-status":"residential",
          "attribution":"test"
        }
      }
    }
  }' | jq .

echo ""
echo "=== Test Complete ==="
