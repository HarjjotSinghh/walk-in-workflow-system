import { Hono } from 'hono';
import { z } from 'zod';
import { Env } from '../db/index';
import { errorResponse } from '../db/utils';

const streamRoutes = new Hono<{ Bindings: Env }>();

// Connection manager for SSE clients
interface SSEConnection {
  id: string;
  userId: string;
  userRole: string;
  controller: ReadableStreamDefaultController<any>;
  createdAt: Date;
}

// In-memory connection store (in production, use Redis or similar)
const connections = new Map<string, SSEConnection>();

// Helper to generate connection ID
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to clean up connection
function cleanupConnection(connectionId: string) {
  const connection = connections.get(connectionId);
  if (connection) {
    try {
      connection.controller.close();
    } catch (error) {
      console.error('Error closing connection:', error);
    }
    connections.delete(connectionId);
    console.log(`Connection ${connectionId} cleaned up. Active connections: ${connections.size}`);
  }
}

// Helper to send event to specific connection
function sendEventToConnection(connection: SSEConnection, event: any): boolean {
  try {
    const eventData = `data: ${JSON.stringify(event)}\n\n`;
    // Convert string to Uint8Array for proper byte stream
    const encoder = new TextEncoder();
    const data = encoder.encode(eventData);
    connection.controller.enqueue(data);
    return true;
  } catch (error) {
    console.error('Failed to send event to connection:', error);
    cleanupConnection(connection.id);
    return false;
  }
}

// GET /api/stream - Server-Sent Events for real-time updates
streamRoutes.get('/', async (c) => {
  try {
    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Origin', c.req.header('origin') || '*');
      c.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Cache-Control, Content-Type, Authorization');
      c.header('Access-Control-Allow-Credentials', 'true');
      return new Response(null, { status: 204 });
    }

    // Get user from context (set by auth middleware)
    const user = (c as any).get('user');
    
    let userRole: string;
    let userId: string;
    
    // If user is authenticated via middleware, use their info
    if (user) {
      userRole = user.role;
      userId = user.id;
    } else {
      // Fallback to query parameters (for backward compatibility)
      userRole = c.req.query('role') || 'guest';
      userId = c.req.query('user_id') || 'unknown';
    }
    
    const connectionId = generateConnectionId();

    console.log(`New SSE connection: ${connectionId} for user ${userId} with role ${userRole}`);

    // Set SSE headers
    c.header('Content-Type', 'text/event-stream; charset=utf-8');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    c.header('Access-Control-Allow-Origin', c.req.header('origin') || '*');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Allow-Headers', 'Cache-Control, Content-Type, Authorization');

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const initialMessage = {
          type: 'connection',
          data: {
            connectionId,
            message: 'Connected to wiws real-time updates',
            userRole,
            userId,
            timestamp: new Date().toISOString(),
            activeConnections: connections.size,
          },
        };
        
        // Store connection
        const connection: SSEConnection = {
          id: connectionId,
          userId,
          userRole,
          controller,
          createdAt: new Date(),
        };
        connections.set(connectionId, connection);
        
        // Send initial message
        const encoder = new TextEncoder();
        const initialData = `data: ${JSON.stringify(initialMessage)}\n\n`;
        controller.enqueue(encoder.encode(initialData));

        // Send welcome message with current status if reception/pa
        if (userRole === 'reception' || userRole === 'pa') {
          const welcomeMessage = {
            type: 'status_update',
            data: {
              message: userRole === 'reception' 
                ? 'Ready to register new visitors'
                : 'Ready to review pending approvals',
              timestamp: new Date().toISOString(),
            },
          };
          const welcomeData = `data: ${JSON.stringify(welcomeMessage)}\n\n`;
          controller.enqueue(encoder.encode(welcomeData));
        }

        // Send periodic heartbeat
        const heartbeatInterval = setInterval(() => {
          const heartbeat = {
            type: 'heartbeat',
            data: {
              timestamp: new Date().toISOString(),
              activeConnections: connections.size,
            },
          };
          
          try {
            const heartbeatData = `data: ${JSON.stringify(heartbeat)}\n\n`;
            controller.enqueue(encoder.encode(heartbeatData));
          } catch (error) {
            console.error('Failed to send heartbeat:', error);
            clearInterval(heartbeatInterval);
            cleanupConnection(connectionId);
          }
        }, 30000); // Every 30 seconds

        // Store cleanup function
        (controller as any).cleanup = () => {
          clearInterval(heartbeatInterval);
          cleanupConnection(connectionId);
        };
      },
      cancel() {
        // Clean up on close
        if ((this as any).cleanup) {
          (this as any).cleanup();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': c.req.header('origin') || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('SSE stream error:', error);
    return c.json(errorResponse('Failed to establish SSE connection'), 500);
  }
});

// POST /api/stream/broadcast - Broadcast event to connected clients
streamRoutes.post('/broadcast', async (c) => {
  try {
    const body = await c.req.json();
    const eventSchema = z.object({
      type: z.string(),
      data: z.any(),
      target_roles: z.array(z.string()).optional(),
      target_users: z.array(z.string()).optional(),
    });

    const event = eventSchema.parse(body);
    console.log(`Broadcasting event: ${event.type} to ${connections.size} connections`);

    let sentCount = 0;
    let errorCount = 0;

    // Broadcast to all matching connections
    for (const [connectionId, connection] of connections.entries()) {
      let shouldSend = false;

      // Check role-based targeting
      if (event.target_roles && event.target_roles.length > 0) {
        shouldSend = event.target_roles.includes(connection.userRole) || shouldSendToRole(connection.userRole, event.type);
      }
      // Check user-based targeting
      else if (event.target_users && event.target_users.length > 0) {
        shouldSend = event.target_users.includes(connection.userId);
      }
      // Default: send to all if no targeting specified
      else {
        shouldSend = shouldSendToRole(connection.userRole, event.type);
      }

      if (shouldSend) {
        const success = sendEventToConnection(connection, {
          ...event,
          timestamp: new Date().toISOString(),
        });
        
        if (success) {
          sentCount++;
        } else {
          errorCount++;
        }
      }
    }

    console.log(`Event ${event.type} sent to ${sentCount} connections, ${errorCount} errors`);

    return c.json({
      success: true,
      message: 'Event broadcasted successfully',
      event_type: event.type,
      sent_count: sentCount,
      error_count: errorCount,
      active_connections: connections.size,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Broadcast error:', error);
    if (error instanceof z.ZodError) {
      return c.json(errorResponse('Invalid event format: ' + error.errors.map(e => e.message).join(', ')), 400);
    }
    return c.json(errorResponse('Failed to broadcast event'), 500);
  }
});

// GET /api/stream/status - Get connection status
streamRoutes.get('/status', async (c) => {
  try {
    const connectionsByRole = new Map<string, number>();
    
    for (const connection of connections.values()) {
      const count = connectionsByRole.get(connection.userRole) || 0;
      connectionsByRole.set(connection.userRole, count + 1);
    }

    return c.json({
      success: true,
      data: {
        total_connections: connections.size,
        connections_by_role: Object.fromEntries(connectionsByRole),
        uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'N/A',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Status error:', error);
    return c.json(errorResponse('Failed to get status'), 500);
  }
});

// POST /api/stream/notify - Send notification to specific users or roles
streamRoutes.post('/notify', async (c) => {
  try {
    const body = await c.req.json();
    const notificationSchema = z.object({
      message: z.string(),
      type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
      target_roles: z.array(z.string()).optional(),
      target_users: z.array(z.string()).optional(),
      duration: z.number().optional().default(5000),
    });

    const notification = notificationSchema.parse(body);

    const event = {
      type: 'notification',
      data: {
        message: notification.message,
        type: notification.type,
        duration: notification.duration,
        timestamp: new Date().toISOString(),
      },
      target_roles: notification.target_roles,
      target_users: notification.target_users,
    };

    // Reuse broadcast logic
    const broadcastResponse = await fetch(`${c.env.BETTER_AUTH_URL || 'http://localhost:8787'}/api/stream/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!broadcastResponse.ok) {
      throw new Error('Failed to broadcast notification');
    }

    const result = await broadcastResponse.json() as any;
    return c.json({
      success: true,
      message: 'Notification sent successfully',
      ...result,
    });

  } catch (error) {
    console.error('Notification error:', error);
    if (error instanceof z.ZodError) {
      return c.json(errorResponse('Invalid notification format: ' + error.errors.map(e => e.message).join(', ')), 400);
    }
    return c.json(errorResponse('Failed to send notification'), 500);
  }
});

// Helper function to determine if event should be sent to specific role
function shouldSendToRole(userRole: string, eventType: string): boolean {
  const rolePermissions: Record<string, string[]> = {
    reception: [
      'visit_created', 'visit_approved', 'visit_denied', 'visit_in_session', 
      'visit_completed', 'visit_status_update', 'notification', 'system_notification'
    ],
    pa: [
      'visit_created', 'visit_pending_approval', 'visit_status_update',
      'notification', 'system_notification'
    ],
    consultant: [
      'visit_assigned', 'visit_approved', 'visit_status_update',
      'visit_in_session', 'visit_completed', 'notification', 'system_notification'
    ],
    admin: ['*'], // Admin gets all events
    guest: ['connection', 'heartbeat'], // Limited access for guests
  };

  const allowedEvents = rolePermissions[userRole] || [];
  
  return allowedEvents.includes('*') || allowedEvents.includes(eventType);
}

// Event types that can be sent through SSE:
/*
Event Types:
- connection: Initial connection established
- heartbeat: Keep connection alive
- visit_created: New visit registered
- visit_approved: Visit approved by PA
- visit_denied: Visit denied by PA
- visit_assigned: Visit assigned to consultant
- visit_in_session: Consultant started session
- visit_completed: Session completed
- visit_cancelled: Visit cancelled
- visit_status_update: General status update
- service_updated: Service information changed
- user_updated: User information changed
- system_notification: General system notifications
*/

export { streamRoutes };