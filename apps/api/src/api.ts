import { hc } from "hono/client";
import App from "./index";
import { env } from "cloudflare:workers";

const envBase = env.BETTER_AUTH_URL || "http://localhost:8787";

export const client = hc<typeof App>(envBase, {
  init: {
    credentials: "include", // Required for sending cookies cross-origin
    mode: "cors", // Enable CORS mode
  },
});
 
// Now your client requests will include credentials
// const response = await client.someProtectedEndpoint.$get();
