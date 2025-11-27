#!/bin/bash

# Script to run migration 0003_fix_foreign_keys.sql using Turso CLI
# Usage: ./run-migration-0003.sh bicaps

DB_NAME=${1:-bicaps}

if [ -z "$DB_NAME" ]; then
    echo "Error: Database name is required"
    echo "Usage: ./run-migration-0003.sh <database-name>"
    exit 1
fi

echo "Running migration 0003_fix_foreign_keys.sql on database: $DB_NAME"
echo ""

# Get the database URL
DB_URL=$(turso db show $DB_NAME --url)
if [ $? -ne 0 ]; then
    echo "Error: Failed to get database URL. Make sure you're logged in and the database exists."
    exit 1
fi

# Execute the migration file
turso db execute $DB_NAME --file migrations/0003_fix_foreign_keys.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
else
    echo ""
    echo "❌ Migration failed!"
    exit 1
fi

