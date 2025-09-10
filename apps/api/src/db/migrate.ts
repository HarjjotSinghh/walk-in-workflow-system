/* 
╭─ ~/De/M/D Drive/Projects/wiws/apps/api  on main !10 ?4 ─── ✔  22.18.0 Node ─╮
╰─ wrangler d1 execute wiws --file ./migrations/0000_organic_bromley.sql --remot
e

 ⛅️ wrangler 4.32.0
───────────────────
✔ ⚠️ This process may take some time, during which your D1 database will be unavailable to serve queries.
  Ok to proceed? … yes
🌀 Executing on remote database wiws (f79ca3cd-5940-4059-9851-7034a824e0b6):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
Note: if the execution fails to complete, your DB will return to its original state and you can safely retry.
├ 🌀 Uploading f79ca3cd-5940-4059-9851-7034a824e0b6.e9bdb3bc98bf837b.sql
│ 🌀 Uploading complete.
│

✘ [ERROR] To execute a transaction, please use the state.storage.transaction() or state.storage.transactionSync() APIs instead of the SQL BEGIN TRANSACTION or SAVEPOINT statements. The JavaScript API is safer because it will automatically roll back on exceptions, and because it interacts correctly with Durable Objects' automatic atomic write coalescing.


If you think this is a bug then please create an issue at https://github.com/cloudflare/workers-sdk/issues/new/choose
✔ Would you like to report this error to Cloudflare? Wrangler's output and the error details will be shared with the Wrangler team to help us diagnose and fix the issue. … no
🪵  Logs were written to "/Users/harjjotsinghh/Library/Preferences/.wrangler/logs/wrangler-2025-08-26_06-47-40_506.log"
╭─ ~/De/M/D /Pr/wiws/apps/api  on main !10 ?4 ── 1 х  took 48s  22.18.0 Node ─╮
╰─                                        
*/
