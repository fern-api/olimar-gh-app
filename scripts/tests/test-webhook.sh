#!/bin/bash

# Test script for sending a GitHub push webhook to the local server
# Usage: ./test-webhook.sh [hostname]
# If hostname is not provided, defaults to localhost

# Read webhook secret from .env file
WEBHOOK_SECRET=$(grep WEBHOOK_SECRET .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$WEBHOOK_SECRET" ]; then
  echo "Error: WEBHOOK_SECRET not found in .env file"
  exit 1
fi

# Define the webhook payload
PAYLOAD='{
  "ref": "refs/heads/main",
  "after": "abc123def456",
  "before": "def456abc123",
  "repository": {
    "name": "test-repo",
    "owner": {
      "login": "testuser"
    },
    "full_name": "testuser/test-repo"
  },
  "head_commit": {
    "id": "abc123",
    "author": {
      "name": "Test User",
      "email": "test@example.com"
    },
    "message": "Test commit",
    "timestamp": "2025-10-22T14:57:40Z",
    "url": "https://github.com/testuser/test-repo/commit/abc123"
  },
  "installation": {
    "id": 12345678,
    "node_id": "MDIzOkluc3RhbGxhdGlvbjEyMzQ1Njc4"
  },
  "sender": {
    "login": "testuser",
    "id": 1,
    "type": "User"
  }
}'

# Calculate signature
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')"

# Get hostname from first argument or default to localhost
HOSTNAME=${1:-localhost}

# Get port from .env or use default (only for localhost)
if [ "$HOSTNAME" = "localhost" ]; then
  PORT=$(grep PORT .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "3000")
  PORT=${PORT:-3000}
  URL="http://$HOSTNAME:$PORT/api/webhook"
else
  URL="http://$HOSTNAME/api/webhook"
fi

echo "Sending test webhook to $URL"
echo ""

# Send the webhook
curl -X POST $URL \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-GitHub-Delivery: $(uuidgen)" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD"

echo ""
echo ""
echo "Test webhook sent!"
