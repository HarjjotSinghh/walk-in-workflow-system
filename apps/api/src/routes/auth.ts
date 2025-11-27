import { Hono } from 'hono';
import { z } from 'zod';
import { Env } from '../db/index';
import {
  createDatabaseUtils,
  createDbClient,
  successResponse,
  errorResponse,
} from "../db/utils";
import { createClerkClient } from "@clerk/backend";
import { authMiddleware, type AuthContext } from "../middleware/authMiddleware";
import type { CloudflareBindings } from "../env";
import type { UserRole } from "../types/auth";

const authRoutes = new Hono<{ Bindings: Env }>();

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["reception", "pa", "consultant", "admin", "anonymous"]),
  password: z.string().min(6),
});

// POST /api/auth/register - Create user in Clerk and sync to local DB
// Note: This endpoint should be protected (admin only) or removed if using Clerk's sign-up UI
authRoutes.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = RegisterSchema.parse(body);

    const env = c.env as CloudflareBindings;
    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });

    const utils = createDatabaseUtils(c.env);
    const db = await createDbClient(c.env);

    // Check if user already exists in Clerk
    try {
      const users = await clerkClient.users.getUserList({
        emailAddress: [validatedData.email],
      });

      if (users.data && users.data.length > 0) {
        return c.json(errorResponse("User already exists"), 409);
      }
    } catch (error) {
      // If error checking, continue with creation
      console.warn("Error checking existing user:", error);
    }

    // Parse name into first and last name
    const nameParts = validatedData.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Create user in Clerk
    const clerkUser = await clerkClient.users.createUser({
      firstName: firstName,
      lastName: lastName,
      emailAddress: [validatedData.email],
      password: validatedData.password,
      publicMetadata: {
        role: validatedData.role,
      },
    });

    // Sync user to local database
    try {
      await db
        .prepare(
          `
        INSERT INTO user (id, email, name, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `
        )
        .bind(
          clerkUser.id,
          validatedData.email,
          validatedData.name,
          validatedData.role,
          utils.getCurrentTimestamp(),
          utils.getCurrentTimestamp()
        )
        .run();
    } catch (dbError) {
      // If DB sync fails, log but don't fail the request
      // User is already created in Clerk
      console.error("Failed to sync user to local database:", dbError);
    }

    // Log audit trail
    await utils.logAudit("user", clerkUser.id, "register", clerkUser.id, null, {
      email: validatedData.email,
      name: validatedData.name,
      role: validatedData.role,
    });

    return c.json(
      successResponse(
        {
          user: {
            id: clerkUser.id,
            email: validatedData.email,
            name: validatedData.name,
            role: validatedData.role,
          },
        },
        "User registered successfully"
      )
    );
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof z.ZodError) {
      return c.json(
        errorResponse(
          "Validation error: " + error.errors.map((e) => e.message).join(", ")
        ),
        400
      );
    }
    return c.json(errorResponse("Registration failed"), 500);
  }
});

// POST /api/auth/logout
// Note: Clerk handles logout on the frontend, but this endpoint can be used for cleanup
authRoutes.post("/logout", authMiddleware, async (c) => {
  try {
    // Clerk handles session management, so we just need to log the action
    const user = (c as AuthContext).get("user");
    if (user) {
      const utils = createDatabaseUtils(c.env);
      await utils.logAudit("user", user.id, "logout", user.id, null, {
        email: user.email,
      });
    }

    return c.json(successResponse(null, "Logout successful"));
  } catch (error) {
    console.error("Logout error:", error);
    return c.json(errorResponse("Logout failed"), 500);
  }
});

// GET /api/auth/me - Get current user info using Clerk authentication
authRoutes.get("/me", authMiddleware, async (c) => {
  try {
    const user = (c as AuthContext).get("user");
    const clerkUser = (c as AuthContext).get("clerkUser");

    if (!user) {
      return c.json(errorResponse("User not found"), 404);
    }

    return c.json(
      successResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
          image: user.image,
          isActive: user.isActive,
        },
      })
    );
  } catch (error) {
    console.error("Get user error:", error);
    return c.json(errorResponse("Failed to get user info"), 500);
  }
});

// POST /api/auth/sync - Sync Clerk user to local database
// This can be called after Clerk sign-up to ensure local DB is in sync
// Optional body: { role?: UserRole } - if provided, this role will be used
authRoutes.post("/sync", authMiddleware, async (c) => {
  try {
    const user = (c as AuthContext).get("user");
    const clerkUserFromContext = (c as AuthContext).get("clerkUser");

    if (!user || !clerkUserFromContext) {
      return c.json(errorResponse("User not found"), 404);
    }

    // Try to get role from request body (passed from frontend during registration)
    let body: { role?: UserRole } = {};
    try {
      body = await c.req.json().catch(() => ({}));
    } catch {
      // Body might be empty, that's okay
    }

    const env = c.env as CloudflareBindings;
    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });

    // Fetch fresh user from Clerk to ensure we have the latest metadata
    // This is important because metadata might not be immediately available after creation
    const clerkUser = await clerkClient.users.getUser(user.id);

    if (!clerkUser) {
      return c.json(errorResponse("User not found in Clerk"), 404);
    }

    const utils = createDatabaseUtils(c.env);
    const db = await createDbClient(c.env);

    // Extract role with priority: request body > unsafeMetadata > publicMetadata > middleware user.role > default
    const roleFromRequest = body.role;
    const roleFromUnsafeMetadata = clerkUser.unsafeMetadata?.role as
      | UserRole
      | undefined;
    const roleFromPublicMetadata = clerkUser.publicMetadata?.role as
      | UserRole
      | undefined;
    const role =
      roleFromRequest ||
      roleFromUnsafeMetadata ||
      roleFromPublicMetadata ||
      user.role ||
      "reception";

    // Log for debugging
    console.log("Sync endpoint - Role extraction:", {
      userId: user.id,
      roleFromRequest,
      unsafeMetadata: clerkUser.unsafeMetadata,
      publicMetadata: clerkUser.publicMetadata,
      roleFromUnsafeMetadata,
      roleFromPublicMetadata,
      userRoleFromMiddleware: user.role,
      finalRole: role,
    });

    // Get user name from Clerk (first + last name)
    const clerkUserName =
      `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
      clerkUser.username ||
      user.name ||
      "User";

    // Get email from Clerk
    const clerkUserEmail =
      clerkUser.emailAddresses[0]?.emailAddress || user.email;

    // Check if user exists in local DB
    const existingUser = await db
      .prepare("SELECT id, role FROM user WHERE id = ?")
      .bind(user.id)
      .first();

    if (existingUser) {
      // Update existing user with role from unsafeMetadata
      const updateResult = await db
        .prepare(
          `
        UPDATE user 
        SET email = ?, name = ?, role = ?, updated_at = ?
        WHERE id = ?
      `
        )
        .bind(
          clerkUserEmail,
          clerkUserName,
          role,
          utils.getCurrentTimestamp(),
          user.id
        )
        .run();

      // Verify the update was successful
      const verifyUser = await db
        .prepare("SELECT id, email, name, role FROM user WHERE id = ?")
        .bind(user.id)
        .first();

      console.log("Sync endpoint - Update result:", {
        userId: user.id,
        oldRole: existingUser.role,
        newRole: role,
        changes: updateResult.meta?.changes,
        verifiedRole: verifyUser?.role,
      });

      if (updateResult.meta?.changes === 0) {
        console.warn(
          "Database update affected 0 rows - user might not exist or data unchanged"
        );
      }
    } else {
      // Insert new user with role from unsafeMetadata
      const insertResult = await db
        .prepare(
          `
        INSERT INTO user (id, email, name, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `
        )
        .bind(
          user.id,
          clerkUserEmail,
          clerkUserName,
          role,
          utils.getCurrentTimestamp(),
          utils.getCurrentTimestamp()
        )
        .run();

      console.log("Sync endpoint - Insert result:", {
        userId: user.id,
        role: role,
        lastRowId: insertResult.meta?.last_row_id,
        changes: insertResult.meta?.changes,
      });
    }

    // Return updated user object with correct role
    const updatedUser = {
      ...user,
      email: clerkUserEmail,
      name: clerkUserName,
      role: role,
    };

    return c.json(
      successResponse({ user: updatedUser }, "User synced successfully")
    );
  } catch (error) {
    console.error("Sync user error:", error);
    return c.json(errorResponse("Failed to sync user"), 500);
  }
});

export { authRoutes };
