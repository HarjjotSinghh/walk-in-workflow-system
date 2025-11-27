import { Context, Next } from 'hono';
import { createClerkClient } from "@clerk/backend";
import type { CloudflareBindings } from "../env";
import type { ApiUser, UserRole, Permission } from "../types/auth";
import { hasPermission, hasRolePermission } from "../lib/permissions";
import type { Env } from "../db/index";

// Extended Hono Context with our custom variables
export interface AuthContext extends Context {
  get: {
    (key: "user"): ApiUser | null;
    (key: "clerkUser"): any;
    (key: "session"): any;
    (key: string): any;
  };
  set: {
    (key: "user", value: ApiUser | null): void;
    (key: "clerkUser", value: any): void;
    (key: "session", value: any): void;
    (key: string, value: any): void;
  };
}

/**
 * Get Clerk session token from request
 * Clerk uses __session cookie for session tokens in browsers
 */
const getSessionToken = (c: Context): string | null => {
  // Try Authorization header first (Bearer token - JWT)
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try Clerk session cookie (primary method for browser-based auth)
  const cookie = c.req.header("cookie");
  if (cookie) {
    // Clerk uses __session cookie for session tokens
    // The cookie value is a JWT token
    const sessionMatch = cookie.match(/__session=([^;]+)/);
    if (sessionMatch) {
      return sessionMatch[1];
    }
    // Also check for __clerk_db_jwt (used in some Clerk setups)
    const jwtMatch = cookie.match(/__clerk_db_jwt=([^;]+)/);
    if (jwtMatch) {
      return jwtMatch[1];
    }
  }

  return null;
};

/**
 * Enhanced authentication middleware using Clerk
 */
export const authMiddleware = async (c: AuthContext, next: Next) => {
  try {
    // Skip auth for public routes
    const path = new URL(c.req.url).pathname;
    const publicPaths = ["/health", "/api/public/"];

    // Allow stream endpoint to use query parameters for authentication
    const isStreamEndpoint = path === "/api/stream";

    if (publicPaths.some((publicPath) => path.startsWith(publicPath))) {
      return await next();
    }

    // Get environment bindings
    const env = c.env as CloudflareBindings;

    // Create Clerk client
    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });

    // Get session token
    const sessionToken = getSessionToken(c);

    // For stream endpoint, allow query parameter authentication as fallback
    if (isStreamEndpoint && !sessionToken) {
      // Try to get user info from query parameters
      const userRole = c.req.query("role");
      const userId = c.req.query("user_id");

      if (userRole && userId) {
        // Validate the user exists in Clerk
        try {
          const clerkUser = await clerkClient.users.getUser(userId);
          if (clerkUser) {
            const role =
              (clerkUser.publicMetadata?.role as UserRole) || "reception";
            const isActive = !clerkUser.banned && !clerkUser.locked;

            if (role === userRole && isActive) {
              const validUser: ApiUser = {
                id: clerkUser.id,
                name:
                  `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
                  clerkUser.username ||
                  "User",
                email: clerkUser.emailAddresses[0]?.emailAddress || "",
                emailVerified:
                  clerkUser.emailAddresses[0]?.verification?.status ===
                  "verified",
                image: clerkUser.imageUrl,
                role: role,
                isActive: isActive,
                isAnonymous: false,
                createdAt: new Date(clerkUser.createdAt),
                updatedAt: new Date(clerkUser.updatedAt),
              };

              c.set("user", validUser);
              c.set("clerkUser", clerkUser);
              c.set("session", null);
              return await next();
            }
          }
        } catch (error) {
          // Fall through to authentication required
        }
      }
    }

    // Authenticate using Clerk
    // Try multiple methods: JWT token verification or authenticateRequest
    try {
      let userId: string | null = null;

      // First, try to get token from Authorization header (JWT from getToken())
      const authHeader = c.req.header("Authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

      // Also try to get token from cookies
      const cookieToken = getSessionToken(c);
      const token = bearerToken || cookieToken;

      // Debug logging in development
      if (process.env.NODE_ENV === "development") {
        console.log("Auth attempt - Has bearer token:", !!bearerToken);
        console.log("Auth attempt - Has cookie token:", !!cookieToken);
        const cookieHeader = c.req.header("cookie");
        console.log("Auth attempt - Cookie header present:", !!cookieHeader);
        if (cookieHeader) {
          console.log(
            "Auth attempt - Cookie preview:",
            cookieHeader.substring(0, 150)
          );
        }
      }

      if (token) {
        // Try to verify the JWT token directly
        // getToken() returns a JWT that can be verified with verifyToken
        try {
          const { verifyToken } = await import("@clerk/backend");
          const payload = await verifyToken(token, {
            secretKey: env.CLERK_SECRET_KEY,
            // Don't require audience for now - Clerk JWTs might not have it
            audience: undefined,
          });
          // JWT payload has 'sub' field with userId
          userId = payload.sub || (payload as any).userId || null;

          if (userId && process.env.NODE_ENV === "development") {
            console.log("Successfully verified JWT token, userId:", userId);
          }
        } catch (verifyError: any) {
          // If verifyToken fails, it might be a session token, not a JWT
          // Or the token might be expired/invalid
          // Log for debugging but continue to try authenticateRequest
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "JWT verification failed:",
              verifyError?.message || verifyError
            );
            console.warn("Token preview:", token.substring(0, 50) + "...");
          }
        }
      }

      // If JWT verification didn't work, try authenticateRequest
      // This handles cookies and session tokens automatically
      if (!userId) {
        try {
          const requestState = await clerkClient.authenticateRequest({
            request: c.req.raw as any,
            publishableKey: env.CLERK_PUBLISHABLE_KEY,
            secretKey: env.CLERK_SECRET_KEY,
          } as any);

          if (requestState.isSignedIn) {
            const auth = requestState.toAuth();
            userId = (auth as any).userId || (auth as any).subject;
          }
        } catch (authError: any) {
          // Log the error for debugging
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "authenticateRequest failed:",
              authError?.message || authError
            );
            // Also log request details for debugging
            console.warn("Request URL:", c.req.url);
            const headers: Record<string, string> = {};
            c.req.raw.headers.forEach((value, key) => {
              headers[key] = value;
            });
            console.warn("Request headers:", headers);
          }
        }
      }

      if (!userId) {
        return c.json(
          { success: false, error: "Authentication required" },
          401
        );
      }

      // Get user details from Clerk
      const clerkUser = await clerkClient.users.getUser(userId);

      if (!clerkUser) {
        return c.json({ success: false, error: "User not found" }, 401);
      }

      // Fetch user from database to get the correct role
      // The role in the database is the source of truth
      const { createDbClient } = await import("../db/utils");
      const db = await createDbClient(c.env);

      let dbUser: {
        role?: UserRole;
        is_active?: number | boolean;
        name?: string;
        email?: string;
      } | null = null;
      try {
        dbUser = await db
          .prepare("SELECT role, is_active, name, email FROM user WHERE id = ?")
          .bind(userId)
          .first();
      } catch (dbError) {
        console.warn("Failed to fetch user from database:", dbError);
        // Continue with Clerk data if DB fetch fails
      }

      // Extract role with priority: database > unsafeMetadata > publicMetadata > default
      const roleFromDb = dbUser?.role;
      const roleFromUnsafeMetadata = clerkUser.unsafeMetadata?.role as
        | UserRole
        | undefined;
      const roleFromPublicMetadata = clerkUser.publicMetadata?.role as
        | UserRole
        | undefined;
      const role =
        roleFromDb ||
        roleFromUnsafeMetadata ||
        roleFromPublicMetadata ||
        "reception";

      // Check if user is active
      // Priority: database is_active > Clerk's banned/locked status
      const isActiveFromDb =
        dbUser?.is_active !== undefined ? Boolean(dbUser.is_active) : null;
      const isActiveFromClerk = !clerkUser.banned && !clerkUser.locked;
      const isActive =
        isActiveFromDb !== null ? isActiveFromDb : isActiveFromClerk;

      if (!isActive) {
        return c.json({ success: false, error: "Account is inactive" }, 403);
      }

      // Get name and email with priority: database > Clerk
      const userName =
        dbUser?.name ||
        `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
        clerkUser.username ||
        "User";
      const userEmail =
        dbUser?.email || clerkUser.emailAddresses[0]?.emailAddress || "";

      // Convert Clerk user to our ApiUser type
      const user: ApiUser = {
        id: clerkUser.id,
        name: userName,
        email: userEmail,
        emailVerified:
          clerkUser.emailAddresses[0]?.verification?.status === "verified",
        image: clerkUser.imageUrl,
        role: role,
        isActive: isActive,
        isAnonymous: false,
        createdAt: new Date(clerkUser.createdAt),
        updatedAt: new Date(clerkUser.updatedAt),
      };

      // Set user and session in context
      c.set("user", user);
      c.set("clerkUser", clerkUser);
      c.set("session", { userId: user.id, role: user.role });

      // Log user activity for audit
      const auditData = {
        userId: user.id,
        action: "api_access",
        resource: path,
        ipAddress:
          c.req.header("CF-Connecting-IP") ||
          c.req.header("X-Forwarded-For") ||
          "unknown",
        userAgent: c.req.header("User-Agent") || "unknown",
      };

      // Store audit data in context for later use
      c.set("auditData", auditData);

      await next();
    } catch (verifyError: any) {
      // Log the actual error for debugging
      console.error(
        "Auth middleware error:",
        verifyError?.message || verifyError
      );
      if (process.env.NODE_ENV === "development") {
        console.error("Full error:", verifyError);
      }
      return c.json(
        {
          success: false,
          error: "Invalid or expired token",
          details:
            process.env.NODE_ENV === "development"
              ? verifyError?.message
              : undefined,
        },
        401
      );
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return c.json({ success: false, error: "Authentication failed" }, 500);
  }
};

/**
 * Middleware factory to require specific permissions
 */
export const requirePermission = (...permissions: Permission[]) => {
  return async (c: AuthContext, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }

    // Check if user has all required permissions
    const hasAllPermissions = permissions.every((permission) =>
      hasPermission({ user }, permission)
    );

    if (!hasAllPermissions) {
      return c.json(
        {
          success: false,
          error: "Insufficient permissions",
          required: permissions,
        },
        403
      );
    }

    await next();
  };
};

/**
 * Middleware factory to require any of the specified permissions
 */
export const requireAnyPermission = (...permissions: Permission[]) => {
  return async (c: AuthContext, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }

    // Check if user has any of the required permissions
    const hasAnyPermission = permissions.some((permission) =>
      hasPermission({ user }, permission)
    );

    if (!hasAnyPermission) {
      return c.json(
        {
          success: false,
          error: "Insufficient permissions",
          required: permissions,
        },
        403
      );
    }

    await next();
  };
};

/**
 * Middleware factory to require specific roles
 */
export const requireRole = (...roles: UserRole[]) => {
  return async (c: AuthContext, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json(
        {
          success: false,
          error: "Insufficient role permissions",
          required: roles,
          current: user.role,
        },
        403
      );
    }

    await next();
  };
};

/**
 * Middleware for admin-only access
 */
export const requireAdmin = requireRole("admin");

/**
 * Middleware for PA or Admin access
 */
export const requirePA = requireRole("pa", "admin");

/**
 * Middleware for Consultant or Admin access
 */
export const requireConsultant = requireRole("consultant", "admin");

/**
 * Middleware for Reception or Admin access
 */
export const requireReception = requireRole("reception", "admin");

/**
 * Middleware for authenticated users only (any role)
 */
export const requireAuth = async (c: AuthContext, next: Next) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ success: false, error: "Authentication required" }, 401);
  }

  await next();
};

/**
 * Middleware to check resource ownership for consultants
 */
export const requireOwnership = (resourceIdParam: string = "id") => {
  return async (c: AuthContext, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }

    // Admins and PAs can access any resource
    if (user.role === "admin" || user.role === "pa") {
      await next();
      return;
    }

    // For consultants, check ownership
    if (user.role === "consultant") {
      const resourceId = c.req.param(resourceIdParam);

      // Properly check if the resource belongs to the consultant
      // This implementation will depend on the specific resource type
      // For visits, check if the visit is assigned to this consultant
      const { createDbClient } = await import("../db/utils");
      const env = c.env as CloudflareBindings;

      if (
        !env.TURSO_DB_URL ||
        !env.TURSO_DB_AUTH_TOKEN ||
        !env.CLERK_SECRET_KEY ||
        !env.CLERK_PUBLISHABLE_KEY
      ) {
        return c.json(
          {
            success: false,
            error: "Database or authentication configuration missing",
          },
          500
        );
      }

      // Convert CloudflareBindings to Env format
      const dbEnv = {
        TURSO_DB_URL: env.TURSO_DB_URL,
        TURSO_DB_AUTH_TOKEN: env.TURSO_DB_AUTH_TOKEN,
        KV: env.KV,
        ENVIRONMENT: env.ENVIRONMENT,
        CLERK_SECRET_KEY: env.CLERK_SECRET_KEY,
        CLERK_PUBLISHABLE_KEY: env.CLERK_PUBLISHABLE_KEY,
        FRONTEND_URL: env.FRONTEND_URL,
      } as Env;
      const db = await createDbClient(dbEnv);
      const visitCheck = await db
        .prepare(
          "SELECT id FROM visits WHERE id = ? AND assigned_consultant_id = ?"
        )
        .bind(resourceId, user.id)
        .first();

      if (!visitCheck) {
        return c.json(
          {
            success: false,
            error: "Access denied: Resource not assigned to you",
          },
          403
        );
      }

      await next();
      return;
    }

    // Reception users can only access resources they created
    if (user.role === "reception") {
      await next();
      return;
    }

    return c.json({ success: false, error: "Access denied" }, 403);
  };
};

/**
 * Optional auth middleware for routes that can work with or without authentication
 */
export const optionalAuth = async (c: AuthContext, next: Next) => {
  try {
    const env = c.env as CloudflareBindings;

    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });

    const sessionToken = getSessionToken(c);

    if (sessionToken) {
      try {
        let userId: string | null = null;

        // First, try to verify the JWT token directly (same as authMiddleware)
        try {
          const { verifyToken } = await import("@clerk/backend");
          const payload = await verifyToken(sessionToken, {
            secretKey: env.CLERK_SECRET_KEY,
            audience: undefined,
          });
          userId = payload.sub || (payload as any).userId || null;
        } catch (verifyError: any) {
          // If verifyToken fails, try authenticateRequest as fallback
          // Only use authenticateRequest for GET/HEAD requests to avoid body issues
          if (c.req.method === "GET" || c.req.method === "HEAD") {
            try {
              const rawRequest = c.req.raw;
              if (rawRequest instanceof Request) {
                const requestState = await clerkClient.authenticateRequest({
                  request: rawRequest,
                  publishableKey: env.CLERK_PUBLISHABLE_KEY,
                  secretKey: env.CLERK_SECRET_KEY,
                } as any);

                if (requestState.isSignedIn) {
                  const auth = requestState.toAuth();
                  userId = (auth as any).userId || (auth as any).subject;
                }
              }
            } catch (authError: any) {
              // Silently fail - this is optional auth
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  "Optional auth authenticateRequest failed:",
                  authError?.message || authError
                );
              }
            }
          }
        }

        if (!userId) {
          c.set("user", null);
          c.set("clerkUser", null);
          c.set("session", null);
          await next();
          return;
        }

        const clerkUser = await clerkClient.users.getUser(userId);

        if (clerkUser) {
          // Fetch user from database to get the correct role
          const { createDbClient } = await import("../db/utils");
          const db = await createDbClient(c.env);

          let dbUser: {
            role?: UserRole;
            is_active?: number | boolean;
            name?: string;
            email?: string;
          } | null = null;
          try {
            dbUser = await db
              .prepare(
                "SELECT role, is_active, name, email FROM user WHERE id = ?"
              )
              .bind(userId)
              .first();
          } catch (dbError) {
            // Silently fail for optional auth
          }

          // Extract role with priority: database > unsafeMetadata > publicMetadata > default
          const roleFromDb = dbUser?.role;
          const roleFromUnsafeMetadata = clerkUser.unsafeMetadata?.role as
            | UserRole
            | undefined;
          const roleFromPublicMetadata = clerkUser.publicMetadata?.role as
            | UserRole
            | undefined;
          const role =
            roleFromDb ||
            roleFromUnsafeMetadata ||
            roleFromPublicMetadata ||
            "reception";

          // Check if user is active
          const isActiveFromDb =
            dbUser?.is_active !== undefined ? Boolean(dbUser.is_active) : null;
          const isActiveFromClerk = !clerkUser.banned && !clerkUser.locked;
          const isActive =
            isActiveFromDb !== null ? isActiveFromDb : isActiveFromClerk;

          // Get name and email with priority: database > Clerk
          const userName =
            dbUser?.name ||
            `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
            clerkUser.username ||
            "User";
          const userEmail =
            dbUser?.email || clerkUser.emailAddresses[0]?.emailAddress || "";

          const user: ApiUser = {
            id: clerkUser.id,
            name: userName,
            email: userEmail,
            emailVerified:
              clerkUser.emailAddresses[0]?.verification?.status === "verified",
            image: clerkUser.imageUrl,
            role: role,
            isActive: isActive,
            isAnonymous: false,
            createdAt: new Date(clerkUser.createdAt),
            updatedAt: new Date(clerkUser.updatedAt),
          };

          c.set("user", user);
          c.set("clerkUser", clerkUser);
          c.set("session", { userId: user.id, role: user.role });
        }
      } catch (error) {
        // Silently fail for optional auth
        console.warn("Optional auth failed:", error);
      }
    }

    c.set("user", c.get("user") || null);
    c.set("clerkUser", c.get("clerkUser") || null);
    c.set("session", c.get("session") || null);

    await next();
  } catch (error) {
    console.warn("Optional auth middleware warning:", error);
    c.set("user", null);
    c.set("clerkUser", null);
    c.set("session", null);
    await next();
  }
};
