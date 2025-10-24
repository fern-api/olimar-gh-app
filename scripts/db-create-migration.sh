#!/bin/sh

# Create a new migration file using Goose
# Usage: ./scripts/db-create-migration.sh migration_name [sql|go]

set -e

MIGRATIONS_DIR="src/database/migrations"
MIGRATION_NAME=$1
MIGRATION_TYPE=${2:-sql}

if [ -z "$MIGRATION_NAME" ]; then
  echo "Error: Migration name is required"
  echo "Usage: ./scripts/db-create.sh migration_name [sql|go]"
  exit 1
fi

echo "Creating new migration: ${MIGRATION_NAME}"
echo "Type: ${MIGRATION_TYPE}"
echo "Directory: ${MIGRATIONS_DIR}"
echo ""

goose -dir "${MIGRATIONS_DIR}" create "${MIGRATION_NAME}" "${MIGRATION_TYPE}"
