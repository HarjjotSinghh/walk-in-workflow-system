import { hc } from "hono/client";
import App from "./index";
import { env } from "cloudflare:workers";

// Use FRONTEND_URL or default to localhost for development
const envBase = env.FRONTEND_URL || "http://localhost:8787";

export const client = hc<typeof App>(envBase, {
  init: {
    credentials: "include", // Required for sending cookies cross-origin
    mode: "cors", // Enable CORS mode
  },
});
 
// Now your client requests will include credentials
// const response = await client.someProtectedEndpoint.$get();
