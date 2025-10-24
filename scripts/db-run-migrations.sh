#!/bin/sh

# Run database migrations using Goose
# Loads environment variables and executes migrations against the database

set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Set defaults
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_NAME=${DB_NAME:-autopilot}

# Construct database URL
DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

# Migration directory
MIGRATIONS_DIR="src/database/migrations"

# Get command (default to "up")
COMMAND=${1:-up}

echo "Running goose migration: $COMMAND"
echo "Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "Migrations dir: ${MIGRATIONS_DIR}"
echo ""

# Run goose with the appropriate command
goose -dir "${MIGRATIONS_DIR}" postgres "${DB_URL}" "${COMMAND}"
