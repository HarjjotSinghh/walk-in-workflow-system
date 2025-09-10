import { createAuthClient } from "better-auth/react";
import { adminClient, anonymousClient, multiSessionClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "/", // Use relative URL for proxy or env var
  plugins: [adminClient(), anonymousClient(), multiSessionClient()],
  fetchOptions: {
    credentials: "include", // Important for cross-origin cookies
  },
});

// Export type-safe session hook
export const { 
  useSession, 
  signIn, 
  signUp, 
  signOut,
  getSession 
} = authClient;
