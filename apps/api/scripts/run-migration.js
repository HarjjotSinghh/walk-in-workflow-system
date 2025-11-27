import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbUrl = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_DB_AUTH_TOKEN;

if (!dbUrl) {
  console.error("Error: TURSO_DB_URL environment variable is required");
  process.exit(1);
}

if (!authToken) {
  console.error("Error: TURSO_DB_AUTH_TOKEN environment variable is required");
  process.exit(1);
}

const migrationFile = join(__dirname, "../migrations/0004_fix_account_user_foreign_key.sql");
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

console.log(`Connecting to database: ${dbUrl.replace(/\/\/.*@/, "//***@")}`);
console.log(`Running migration: ${migrationFile}`);
console.log(`Executing ${statements.length} SQL statements...\n`);

const client = createClient({
  url: dbUrl,
  authToken: authToken,
});

try {
  // Filter out PRAGMA statements and prepare statements for execution
  const executableStatements = statements
    .filter((stmt) => {
      const trimmed = stmt.trim();
      return trimmed.length > 0 && !trimmed.toUpperCase().startsWith("PRAGMA");
    })
    .map((stmt) => stmt.trim());

  console.log(`Executing ${executableStatements.length} SQL statements (skipped ${statements.length - executableStatements.length} PRAGMA statements)...\n`);

  // Execute statements sequentially (required for DROP then CREATE)
  for (let i = 0; i < executableStatements.length; i++) {
    const statement = executableStatements[i];
    console.log(`[${i + 1}/${executableStatements.length}] Executing: ${statement.substring(0, 60)}...`);
    
    try {
      const result = await client.execute(statement);
      console.log(`  ✓ Success`);
    } catch (stmtError) {
      // If it's a "table doesn't exist" error on DROP, that's okay
      if (statement.toUpperCase().includes("DROP TABLE") && stmtError.message?.includes("does not exist")) {
        console.log(`  ⚠ Table doesn't exist (this is okay for DROP IF EXISTS)`);
        continue;
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

