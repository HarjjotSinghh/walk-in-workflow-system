import { createClient } from "@libsql/client";

import {config} from 'dotenv';
config({path: path.join(__dirname, ['../../../.env', '../../.env'])});

const dbUrl = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_DB_AUTH_TOKEN;

if (!dbUrl || !authToken) {
  console.error("Missing TURSO_DB_URL or TURSO_DB_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({
  url: dbUrl,
  authToken: authToken,
});

try {
  console.log("Testing connection...");
  const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log("✅ Connected successfully!");
  console.log("\nTables in database:");
  result.rows.forEach((row) => {
    console.log(`  - ${row.name}`);
  });
  
  // Check account table structure if it exists
  if (result.rows.some((r) => r.name === "account")) {
    console.log("\nChecking account table structure...");
    const accountInfo = await client.execute("PRAGMA table_info(account)");
    console.log("Account table columns:");
    accountInfo.rows.forEach((row) => {
      console.log(`  ${row.name}: ${row.type} ${row.notnull ? "NOT NULL" : ""} ${row.pk ? "PRIMARY KEY" : ""}`);
    });
  }
  
  process.exit(0);
} catch (error) {
  console.error("❌ Connection failed:", error.message);
  if (error.cause) {
    console.error("Cause:", error.cause);
  }
  process.exit(1);
}

