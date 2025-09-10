import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

function getLocalD1DB() {
    try {
        const basePath = path.resolve(".wrangler");
        const dbFile = fs
            .readdirSync(basePath, { encoding: "utf-8", recursive: true })
            .find(f => f.endsWith(".sqlite"));

        if (!dbFile) {
            throw new Error(`.sqlite file not found in ${basePath}`);
        }

        const url = path.resolve(basePath, dbFile);
        return url;
    } catch (err) {
        console.log(`Error  ${err}`);
    }
}

import { env } from "cloudflare:workers";

const authToken = env.TURSO_DB_AUTH_TOKEN;
const dbUrl = env.TURSO_DB_URL;

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: authToken ? 'turso' : 'sqlite',
  dbCredentials: {
    url: dbUrl,
    authToken: authToken,
  },
});
