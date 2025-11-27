import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { Env } from "./db/index";
import {
  authMiddleware,
  optionalAuth,
  AuthContext,
} from "./middleware/authMiddleware";
import { servicesRoutes } from "./routes/services";
import { visitsRoutes } from "./routes/visits";
import { usersRoutes } from "./routes/users";
import { analyticsRoutes } from "./routes/analytics";
import { streamRoutes } from "./routes/stream";
import { authRoutes } from "./routes/auth";
import type { ApiUser } from "./types/auth";

const app = new Hono<{
  Bindings: Env;
  Variables: {
    user: ApiUser | null;
    session: any;
    clerkUser: any;
    auditData?: any;
  };
}>();

// Middleware
app.use("*", logger());
app.use("*", prettyJSON());

// Global CORS middleware - applies to all routes
// This ensures CORS headers are present for all requests, including preflight OPTIONS
app.use(
  "*",
  cors({
    origin: (origin) => {
      // List of allowed origins (required when using credentials: true)
      const allowedOrigins = [
        "http://localhost:5173", // Vite dev server default
        "http://localhost:5174", // Vite dev server alternative
        "http://localhost:3000", // Alternative dev server
        "http://localhost:4173", // Vite preview server
        "http://127.0.0.1:5173", // Alternative localhost
        "http://127.0.0.1:5174", // Alternative localhost
        "https://wiws.pages.dev",
        "https://wiws.vercel.app",
        "https://wiws-frontend.pages.dev",
        "https://wiws.harjjotsinghh.workers.dev",
        "https://wiws-api.harjjotsinghh.workers.dev",
        "https://wiws-prod.harjjotsinghh.workers.dev",
        "https://wiws-db.harjjotsinghh.workers.dev",
        "https://wiws-frontend.harjjotsinghh.workers.dev",
        "https://wiws.verbflo.com",
        "https://www.wiws.verbflo.com",
      ];

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        // For requests without origin, allow but note that cookies won't work
        return allowedOrigins[0] || "http://localhost:5173";
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return origin;
      }

      // Deny requests from unknown origins when using credentials
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
    exposeHeaders: ["Content-Length", "Set-Cookie"],
    credentials: true, // Required for cookies to work
    maxAge: 86400, // 24 hours
  })
);

// CORS configuration for auth routes (more specific, but global CORS above handles it)
app.use(
  "/api/auth/**",
  cors({
    origin: [
      "http://localhost:5173", // Vite dev server default
      "http://localhost:5174", // Vite dev server alternative
      "http://localhost:3000", // Alternative dev server
      "http://localhost:4173", // Vite preview server
      "http://127.0.0.1:5173", // Alternative localhost
      "http://127.0.0.1:5174", // Alternative localhost
      "https://wiws.pages.dev",
      "https://wiws.vercel.app",
      "https://wiws-frontend.pages.dev",
      "https://wiws.harjjotsinghh.workers.dev",
      "https://wiws-prod.harjjotsinghh.workers.dev",
      "https://wiws-db.harjjotsinghh.workers.dev",
      "https://wiws-frontend.harjjotsinghh.workers.dev",
      "https://wiws.verbflo.com",
      "https://www.wiws.verbflo.com",
    ],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Set-Cookie"],
    maxAge: 600,
    credentials: true,
  })
);

// Note: Global CORS middleware above handles all routes, including /api/*
// The specific CORS configurations below are kept for backward compatibility
// but the global middleware ensures all routes have proper CORS headers

// Enhanced auth middleware for protected routes
// Note: /api/auth/* routes are handled by authRoutes below
app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;

  // Skip auth routes - they handle their own authentication
  if (path.startsWith("/api/auth/")) {
    return await next();
  }

  // Skip auth for public routes
  const publicPaths = [
    "/health",
    "/api/session",
    "/seed",
    "/api/services",
    "/api/visits",
    "/api/analytics",
    "/api/users",
  ];

  // Allow stream endpoint to handle its own authentication
  const isStreamEndpoint = path.startsWith("/api/stream");

  if (
    publicPaths.some((publicPath) => path.startsWith(publicPath)) ||
    isStreamEndpoint
  ) {
    return optionalAuth(c as AuthContext, next);
  }

  // Use strict auth for all other API routes
  return authMiddleware(c as AuthContext, next);
});

// Health check endpoint
app.get("/health", async (c) => {
  try {
    // Check if environment variables are set
    const dbUrl = c.env.TURSO_DB_URL;
    const hasAuthToken = !!c.env.TURSO_DB_AUTH_TOKEN;
    
    if (!dbUrl) {
      return c.json(
        {
          status: "error",
          database: "configuration error",
          error: "TURSO_DB_URL is not set",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }

    if (!hasAuthToken) {
      return c.json(
        {
          status: "error",
          database: "configuration error",
          error: "TURSO_DB_AUTH_TOKEN is not set",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }

    // Test database connection using libsql
    const { createDbClient } = await import("./db/utils");
    const db = await createDbClient(c.env);
    
    // Simple test query
    const testQuery = await db.prepare("SELECT 1 as test").first();

    return c.json({
      status: "healthy",
      database: testQuery ? "connected" : "not connected",
      dbUrl: dbUrl.replace(/\/\/.*@/, "//***@"), // Mask credentials in URL
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("Health check error:", {
      message: errorMessage,
      stack: errorStack,
      env: {
        hasDbUrl: !!c.env.TURSO_DB_URL,
        hasAuthToken: !!c.env.TURSO_DB_AUTH_TOKEN,
        dbUrlPrefix: c.env.TURSO_DB_URL?.substring(0, 20) || "not set",
      },
    });

    return c.json(
      {
        status: "error",
        database: "connection failed",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Simple database test endpoint
app.get("/test-db", async (c) => {
  try {
    // Test if services table exists and get data
    const { createDbClient } = await import("./db/utils");
    const db = await createDbClient(c.env);
    const servicesTest = await db
      .prepare("SELECT COUNT(*) as count FROM services WHERE 1=1")
      .first();
    const usersTest = await db
      .prepare("SELECT COUNT(*) as count FROM users WHERE 1=1")
      .first();

    return c.json({
      success: true,
      services: servicesTest,
      users: usersTest,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Seed data endpoint for development
app.post("/seed", async (c) => {
  try {
    // Insert default services
    const services = [
      {
        name: "ITR Filing",
        description: "Income Tax Return filing and advisory",
        est_minutes: 30,
      },
      {
        name: "GST Registration",
        description: "GST registration and compliance",
        est_minutes: 45,
      },
      {
        name: "Company Registration",
        description: "New company incorporation",
        est_minutes: 60,
      },
      {
        name: "Tax Advisory",
        description: "Tax planning and consultation",
        est_minutes: 30,
      },
      {
        name: "Audit Services",
        description: "Financial audit and assurance",
        est_minutes: 90,
      },
    ];

    const { createDbClient } = await import("./db/utils");
    const db = await createDbClient(c.env);

    for (const service of services) {
      await db
        .prepare(
          `
        INSERT OR IGNORE INTO services (name, description, est_minutes, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `
        )
        .bind(
          service.name,
          service.description,
          service.est_minutes,
          new Date().toISOString(),
          new Date().toISOString()
        )
        .run();
    }

    // Insert test users (in production, these would be created via proper registration)
    const testUsers = [
      {
        id: "reception-001",
        name: "Reception Staff",
        email: "reception@wiws.com",
        role: "reception",
      },
      { id: "pa-001", name: "PA Assistant", email: "pa@wiws.com", role: "pa" },
      {
        id: "consultant-001",
        name: "CA Consultant 1",
        email: "consultant1@wiws.com",
        role: "consultant",
      },
      {
        id: "consultant-002",
        name: "CA Consultant 2",
        email: "consultant2@wiws.com",
        role: "consultant",
      },
      {
        id: "admin-001",
        name: "Admin User",
        email: "admin@wiws.com",
        role: "admin",
      },
      {
        id: "anonymous-001",
        name: "Anonymous User",
        email: "anonymous@wiws.com",
        role: "anonymous",
      },
    ];

    for (const user of testUsers) {
      await db
        .prepare(
          `
        INSERT OR IGNORE INTO users (id, name, email, email_verified, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, 1, ?, ?)
      `
        )
        .bind(
          user.id,
          user.name,
          user.email,
          user.role,
          new Date().toISOString(),
          new Date().toISOString()
        )
        .run();
    }

    return c.json({
      success: true,
      message: "Database seeded successfully",
      services: services.length,
      users: testUsers.length,
    });
  } catch (error: unknown) {
    console.error("Seed error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Landing page with anonymous login
app.get("/", async (c) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>wiws API - Walk-in Workflow System</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 20px 0; }
        .header { text-align: center; margin-bottom: 24px; }
        .title { font-size: 2rem; font-weight: bold; margin: 0; }
        .subtitle { color: #6b7280; font-size: 0.875rem; margin: 8px 0 0 0; }
        .content { space-y: 16px; }
        .info-row { margin: 12px 0; }
        .info-row strong { display: inline-block; width: 120px; }
        button { padding: 8px 16px; margin: 8px 4px; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; }
        .primary-btn { background: #3b82f6; color: white; border-color: #3b82f6; }
        .danger-btn { background: #ef4444; color: white; border-color: #ef4444; }
        footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; padding: 16px; font-size: 0.875rem; color: #6b7280; background: white; border-top: 1px solid #e5e7eb; }
        footer a { color: #3b82f6; text-decoration: underline; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1 class="title">wiws API</h1>
            <p class="subtitle">Walk-in Workflow System v1.0.0</p>
        </div>
        
        <div id="status">Loading...</div>
        
        <div id="not-logged-in" style="display:none;">
            <button onclick="loginAnonymously()" class="primary-btn">Login Anonymously</button>
        </div>
        
        <div id="logged-in" style="display:none;">
            <div class="content">
                <p>Welcome, <span id="user-name" style="font-weight: 600;"></span>!</p>
                <div id="user-info"></div>
                <div id="geolocation-info"></div>
                <div style="margin-top: 24px;">
                    <button onclick="tryProtectedRoute()" class="primary-btn">Try Protected Route</button>
                    <button onclick="logout()">Logout</button>
                </div>
            </div>
        </div>
        
        <div id="protected-result"></div>
    </div>
    
    <footer>
        wiws Walk-in Workflow System | 
        <a href="/api/session" target="_blank" rel="noopener noreferrer">Session Info</a>
        |
        <a href="/health" target="_blank" rel="noopener noreferrer">Health Check</a>
    </footer>

    <script>
        let currentUser = null;

        async function checkStatus() {
            try {
                const response = await fetch('/api/auth/get-session', {
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    showNotLoggedIn();
                    return;
                }
                
                const text = await response.text();
                
                if (!text || text.trim() === '') {
                    showNotLoggedIn();
                    return;
                }
                
                const result = JSON.parse(text);
                
                if (result?.session) {
                    currentUser = result.user;
                    await showLoggedIn();
                } else {
                    showNotLoggedIn();
                }
            } catch (error) {
                console.error('Error checking status:', error);
                showNotLoggedIn();
            }
        }

        async function loginAnonymously() {
            try {
                await checkStatus();
                if (currentUser) {
                    return;
                }
                
                const response = await fetch('/api/auth/sign-in/anonymous', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
                
                const text = await response.text();
                
                if (!response.ok) {
                    if (text.includes('ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY')) {
                        alert('You are already logged in anonymously!');
                        await checkStatus();
                        return;
                    }
                    alert('Anonymous login failed: HTTP ' + response.status + ' - ' + text);
                    return;
                }
                
                const result = JSON.parse(text);
                
                if (result.user) {
                    currentUser = result.user;
                    await showLoggedIn();
                } else {
                    alert('Anonymous login failed: ' + (result.error?.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Anonymous login error:', error);
                alert('Anonymous login failed: ' + error.message);
            }
        }

        async function logout() {
            try {
                await fetch('/api/auth/sign-out', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
                currentUser = null;
                showNotLoggedIn();
                document.getElementById('protected-result').innerHTML = '';
            } catch (error) {
                alert('Logout failed: ' + error.message);
            }
        }

        async function tryProtectedRoute() {
            try {
                const response = await fetch('/protected', {
                    credentials: 'include'
                });
                const text = await response.text();
                
                document.getElementById('protected-result').innerHTML = 
                    '<h3>Protected Route Result:</h3><div style="border:1px solid #ccc; padding:10px; margin:10px 0;">' + text + '</div>';
            } catch (error) {
                document.getElementById('protected-result').innerHTML = 
                    '<h3>Protected Route Error:</h3><div style="border:1px solid red; padding:10px; margin:10px 0;">' + error.message + '</div>';
            }
        }

        async function showLoggedIn() {
            document.getElementById('status').innerHTML = 'Status: Logged In';
            document.getElementById('not-logged-in').style.display = 'none';
            document.getElementById('logged-in').style.display = 'block';
            
            if (currentUser) {
                document.getElementById('user-name').textContent = currentUser.name || currentUser.email || 'User';
                
                document.getElementById('user-info').innerHTML = 
                    '<div class="info-row"><strong>Email:</strong> ' + (currentUser.email || 'Anonymous') + '</div>' +
                    '<div class="info-row"><strong>User ID:</strong> ' + currentUser.id + '</div>';
                
                try {
                    const geoResponse = await fetch('/api/auth/cloudflare/geolocation', {
                        credentials: 'include'
                    });
                    
                    if (geoResponse.ok) {
                        const geoData = await geoResponse.json();
                        document.getElementById('geolocation-info').innerHTML = 
                            '<div class="info-row"><strong>Timezone:</strong> ' + (geoData.timezone || 'Unknown') + '</div>' +
                            '<div class="info-row"><strong>City:</strong> ' + (geoData.city || 'Unknown') + '</div>' +
                            '<div class="info-row"><strong>Country:</strong> ' + (geoData.country || 'Unknown') + '</div>' +
                            '<div class="info-row"><strong>Region:</strong> ' + (geoData.region || 'Unknown') + '</div>' +
                            '<div class="info-row"><strong>Region Code:</strong> ' + (geoData.regionCode || 'Unknown') + '</div>' +
                            '<div class="info-row"><strong>Data Center:</strong> ' + (geoData.colo || 'Unknown') + '</div>' +
                            (geoData.latitude ? '<div class="info-row"><strong>Latitude:</strong> ' + geoData.latitude + '</div>' : '') +
                            (geoData.longitude ? '<div class="info-row"><strong>Longitude:</strong> ' + geoData.longitude + '</div>' : '');
                    } else {
                        document.getElementById('geolocation-info').innerHTML = '<div class="info-row"><strong>Geolocation:</strong> Unable to fetch</div>';
                    }
                } catch (error) {
                    document.getElementById('geolocation-info').innerHTML = '<div class="info-row"><strong>Geolocation:</strong> Error fetching data</div>';
                }
            }
        }

        function showNotLoggedIn() {
            document.getElementById('status').innerHTML = 'Status: Not Logged In';
            document.getElementById('not-logged-in').style.display = 'block';
            document.getElementById('logged-in').style.display = 'none';
        }

        checkStatus();
    </script>
</body>
</html>
  `;
  return c.html(html);
});

// Protected route that shows different content based on auth status
app.get("/protected", optionalAuth, async (c) => {
  const user = c.get("user") as ApiUser | null;
  const session = c.get("session");

  if (user && session) {
    return c.html(`
            <h2>🔒 Protected Content - You're In!</h2>
            <p>Welcome to the protected area!</p>
            <p><strong>User ID:</strong> ${user.id}</p>
            <p><strong>Name:</strong> ${user.name}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Session ID:</strong> ${session.id}</p>
            <p><strong>Active:</strong> ${user.isActive ? "Yes" : "No"}</p>
            <p><strong>Anonymous:</strong> ${user.isAnonymous ? "Yes" : "No"}</p>
            <p><strong>Created At:</strong> ${new Date(user.createdAt).toLocaleString()}</p>
            <p>This content is only visible to authenticated users (including anonymous ones)!</p>
        `);
  } else {
    return c.html(
      `
            <h2>❌ Access Denied</h2>
            <p>You need to be logged in to see this content.</p>
            <p>Go back and login anonymously first!</p>
        `,
      401
    );
  }
});

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "wiws API - Walk-in Workflow System",
    version: "1.0.0",
    environment: c.env.ENVIRONMENT || "development",
  });
});

// Session info endpoint with enhanced user information
app.get("/api/session", optionalAuth, (c) => {
  const session = c.get("session");
  const user = c.get("user") as ApiUser | null;

  if (!user) {
    return c.json({
      authenticated: false,
      user: null,
      session: null,
    });
  }

  return c.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isAnonymous: user.isAnonymous,
    },
    session: session
      ? {
          userId: session.userId,
          role: session.role,
        }
      : null,
  });
});

// API routes
app.route("/api/auth", authRoutes);
app.route("/api/services", servicesRoutes);
app.route("/api/visits", visitsRoutes);
app.route("/api/users", usersRoutes);
app.route("/api/analytics", analyticsRoutes);
app.route("/api/stream", streamRoutes);

// Scheduled event handler for daily token reset
app.get("/cron/reset-tokens", async (c) => {
  // This endpoint will be called by Cloudflare Workers cron trigger
  try {
    const { createDbClient } = await import("./db/utils");
    const db = await createDbClient(c.env);
    const today = new Date().toISOString().split("T")[0];
    await db
      .prepare(
        "INSERT OR REPLACE INTO token_counter (id, date, counter, updated_at) VALUES (1, ?, 0, ?)"
      )
      .bind(today, new Date().toISOString())
      .run();

    return c.json({
      success: true,
      message: "Token counter reset successfully",
      date: today,
    });
  } catch (error) {
    console.error("Token reset error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to reset token counter",
      },
      500
    );
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Endpoint not found',
    statusCode: 404,
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    success: false,
    error: 'Internal server error',
    statusCode: 500,
  }, 500);
});

export default app;
