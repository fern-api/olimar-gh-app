#!/bin/bash

# Test script for sending a GitHub push webhook to the local server
# Usage: ./test-webhook.sh

# Read webhook secret from .env file
WEBHOOK_SECRET=$(grep WEBHOOK_SECRET .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$WEBHOOK_SECRET" ]; then
  echo "Error: WEBHOOK_SECRET not found in .env file"
  exit 1
fi

# Define the webhook payload
PAYLOAD='{
  "ref": "refs/heads/main",
  "repository": {
    "name": "test-repo",
    "owner": {
      "login": "testuser"
    }
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
  }
}'

# Calculate signature
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')"

# Get port from .env or use default
PORT=$(grep PORT .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "3000")
PORT=${PORT:-3000}

echo "Sending test webhook to http://localhost:$PORT/api/webhook"
echo ""

# Send the webhook
curl -X POST http://localhost:$PORT/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-GitHub-Delivery: $(uuidgen)" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD"

echo ""
echo ""
echo "Test webhook sent!"
