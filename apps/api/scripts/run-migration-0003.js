import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { execSync } from "child_process";

import {config} from 'dotenv';

config({path: ['../../../.env', '../../.env']});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to get database URL from Turso CLI, fallback to environment variables
// let dbUrl = process.env.TURSO_DB_URL;
let dbUrl ='libsql://bicaps-harjjotsinghh.aws-ap-south-1.turso.io'
let authToken='eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjQxNTMyNTgsImlkIjoiMDYzNjdhNjYtOWFiZi00MGI0LWI3ZGMtMTliZGRhZmZlZmZjIiwicmlkIjoiYjQzYWFmYWItNzA5MS00NTUyLTlmZWEtODc2MmMwODI2ZmUxIn0.y5duOvMM22YwylxQz08ZRogobmIi2LwgydrYfNs9hvxuHo-iQOaC4QHXUKzs6p874EY0BK3I95hco8yU9oJCAg'

// let authToken = process.env.TURSO_DB_AUTH_TOKEN;

const dbName = process.argv[2] || "bicaps";

// If TURSO_DB_URL is not set, try to get it from Turso CLI
if (!dbUrl) {
  try {
    console.log(`Getting database URL for "${dbName}" from Turso CLI...`);
    const urlOutput = execSync(`turso db show ${dbName} --url`, { encoding: "utf-8" });
    dbUrl = urlOutput.trim();
    console.log(`✓ Got database URL from Turso CLI`);
  } catch (error) {
    console.error("Error: Could not get database URL from Turso CLI.");
    console.error("Please either:");
    console.error("  1. Install Turso CLI and login: turso auth login");
    console.error("  2. Set TURSO_DB_URL and TURSO_DB_AUTH_TOKEN environment variables");
    process.exit(1);
  }
}

// If TURSO_DB_AUTH_TOKEN is not set, try to get it from Turso CLI
if (!authToken) {
  try {
    console.log(`Getting database token for "${dbName}" from Turso CLI...`);
    const tokenOutput = execSync(`turso db tokens create ${dbName} --expiration 1h`, { encoding: "utf-8" });
    // Extract token from output (format: "Token: <token>")
    const match = tokenOutput.match(/Token:\s*(\S+)/);
    if (match) {
      authToken = match[1];
      console.log(`✓ Got database token from Turso CLI`);
    } else {
      throw new Error("Could not parse token from Turso CLI output");
    }
  } catch (error) {
    console.error("Error: Could not get database token from Turso CLI.");
    console.error("Please set TURSO_DB_AUTH_TOKEN environment variable");
    process.exit(1);
  }
}

const migrationFile = join(__dirname, "../migrations/0003_fix_foreign_keys.sql");
const sql = readFileSync(migrationFile, "utf-8");

// Remove comments and split into statements
const cleanSql = sql
  .split("\n")
  .map((line) => {
    // Remove inline comments
    const commentIndex = line.indexOf("--");
    if (commentIndex >= 0) {
      return line.substring(0, commentIndex).trim();
    }
    return line.trim();
  })
  .filter((line) => line.length > 0)
  .join("\n");

// Split by semicolon, but keep multi-line statements together
const statements = cleanSql
  .split(";")
  .map((s) => s.trim().replace(/\s+/g, " "))
  .filter((s) => s.length > 0);

console.log(`\nConnecting to database: ${dbUrl.replace(/\/\/.*@/, "//***@")}`);
console.log(`Running migration: ${migrationFile}`);
console.log(`Executing ${statements.length} SQL statements...\n`);

const client = createClient({
  url: dbUrl,
  authToken: authToken,
});

try {
  console.log(`Executing ${statements.length} SQL statements (including PRAGMA statements)...\n`);

  // Execute ALL statements sequentially in order (including PRAGMA)
  // This ensures foreign keys are disabled before dropping tables
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (statement.length === 0) continue;
    
    const isPragma = statement.toUpperCase().startsWith("PRAGMA");
    const displayText = isPragma 
      ? statement 
      : `${statement.substring(0, 60)}...`;
    
    console.log(`[${i + 1}/${statements.length}] ${isPragma ? 'Setting' : 'Executing'}: ${displayText}`);
    
    try {
      const result = await client.execute(statement);
      if (isPragma) {
        console.log(`  ✓ ${statement}`);
      } else {
        console.log(`  ✓ Success`);
      }
    } catch (stmtError) {
      // If it's a "table doesn't exist" error on DROP, that's okay
      if (statement.toUpperCase().includes("DROP TABLE") && stmtError.message?.includes("does not exist")) {
        console.log(`  ⚠ Table doesn't exist (this is okay for DROP IF EXISTS)`);
        continue;
      }
      // If it's an "index already exists" error, drop it first and retry
      if (stmtError.message?.includes("already exists") && statement.toUpperCase().includes("CREATE INDEX")) {
        const indexMatch = statement.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(\w+)/i);
        if (indexMatch) {
          const indexName = indexMatch[1];
          console.log(`  ⚠ Index ${indexName} already exists - dropping it first...`);
          try {
            await client.execute(`DROP INDEX IF EXISTS ${indexName}`);
            console.log(`    ✓ Dropped existing index ${indexName}`);
            // Retry creating the index
            await client.execute(statement);
            console.log(`  ✓ Success (after dropping existing index)`);
            continue;
          } catch (dropError) {
            console.error(`  ❌ Failed to drop index: ${dropError.message}`);
          }
        }
      }
      // If it's a foreign key constraint error when dropping users, drop referencing tables first
      if (stmtError.code === 'SQLITE_CONSTRAINT' && statement.toUpperCase().includes("DROP TABLE") && statement.includes("users")) {
        console.log(`  ⚠ Foreign key constraint detected - dropping referencing tables first...`);
        // Drop tables that reference users first (in correct order)
        const referencingTables = ['visits', 'audit', 'session', 'account'];
        for (const refTable of referencingTables) {
          try {
            console.log(`    Dropping ${refTable}...`);
            await client.execute(`DROP TABLE IF EXISTS ${refTable}`);
            console.log(`    ✓ Dropped ${refTable}`);
          } catch (e) {
            // Ignore errors - table might not exist or already dropped
            if (!e.message?.includes("does not exist")) {
              console.log(`    ⚠ ${refTable}: ${e.message}`);
            }
          }
        }
        // Now try dropping users again
        try {
          await client.execute(statement);
          console.log(`  ✓ Success (after dropping referencing tables)`);
          continue;
        } catch (retryError) {
          console.error(`  ❌ Still failed: ${retryError.message}`);
          throw retryError;
        }
      }
      console.error(`  ❌ Error: ${stmtError.message}`);
      console.error(`  Full statement: ${statement}`);
      throw stmtError;
    }
  }

  console.log("\n✅ Migration completed successfully!");
  process.exit(0);

} catch (error) {
  console.error("\n❌ Migration failed:", error);
  console.error("Error details:", error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}

