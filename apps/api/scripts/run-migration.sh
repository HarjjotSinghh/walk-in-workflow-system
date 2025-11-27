#!/bin/bash
# Run migration against Turso database
# Usage: ./run-migration.sh

cd "$(dirname "$0")/.." || exit 1

# Check if turso is available
if ! command -v turso &> /dev/null; then
    echo "Error: turso CLI is not installed or not in PATH"
    exit 1
fi

# Get database name (default to bicaps based on your setup)
DB_NAME="${1:-bicaps}"

echo "Running migration against database: $DB_NAME"
echo "Migration file: migrations/0004_fix_account_user_foreign_key.sql"
echo ""

# Run the migration using turso shell
turso db shell "$DB_NAME" < migrations/0004_fix_account_user_foreign_key.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
else
    echo ""
    echo "❌ Migration failed!"
    exit 1
fi

