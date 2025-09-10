import { Hono } from 'hono';
import { z } from 'zod';
import { createDatabaseUtils, errorResponse, successResponse } from '../db/utils';
import { Env } from '../db';

const visitsRoutes = new Hono<{ Bindings: Env }>();

// Validation schemas
const CreateVisitSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone number must be 10 digits'),
  service_id: z.number().int().positive(),
  notes: z.string().optional(),
  reception_id: z.string().min(1),
});

const UpdateVisitStatusSchema = z.object({
  status: z.enum(['new', 'approved', 'denied', 'in_session', 'completed', 'cancelled']),
  assigned_consultant_id: z.string().optional(),
  pa_id: z.string().optional(),
  notes: z.string().optional(),
  session_notes: z.string().optional(),
});

// GET /api/visits/today - Get all visits for today
visitsRoutes.get('/today', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const visitsResult = await c.env.DB_PROD.prepare(`
      SELECT 
        v.*,
        s.name as service_name,
        s.est_minutes as service_est_minutes,
        u1.name as consultant_name,
        u2.name as pa_name,
        u3.name as reception_name
      FROM visits v
      LEFT JOIN services s ON v.service_id = s.id
      LEFT JOIN user u1 ON v.assigned_consultant_id = u1.id
      LEFT JOIN user u2 ON v.pa_id = u2.id
      LEFT JOIN user u3 ON v.reception_id = u3.id
      WHERE date(v.created_at) = ?
      ORDER BY v.created_at DESC
    `).bind(today).all();

    return c.json(successResponse({
      visits: visitsResult.results.map((visit: any) => ({
        id: visit.id,
        token: visit.token,
        name: visit.name,
        phone: visit.phone,
        service: {
          id: visit.service_id,
          name: visit.service_name,
          est_minutes: visit.service_est_minutes,
        },
        status: visit.status,
        assignedConsultant: visit.consultant_name || null,
        assignedConsultantId: visit.assigned_consultant_id || null,
        pa: visit.pa_name || null,
        paId: visit.pa_id || null,
        reception: visit.reception_name || null,
        receptionId: visit.reception_id,
        notes: visit.notes || null,
        sessionNotes: visit.session_notes || null,
        waitTime: visit.wait_time_minutes || null,
        sessionStartTime: visit.session_start_time || null,
        sessionEndTime: visit.session_end_time || null,
        createdAt: visit.created_at,
        updatedAt: visit.updated_at,
      })),
    }));

  } catch (error) {
    console.error('Get today visits error:', error);
    return c.json(errorResponse('Failed to fetch today visits'), 500);
  }
});

// GET /api/visits/pending-approval - Get visits pending PA approval
visitsRoutes.get('/pending-approval', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const utils = createDatabaseUtils(c.env);
    
    const visitsResult = await c.env.DB_PROD.prepare(`
      SELECT 
        v.id, v.token, v.name, v.phone, v.notes, v.created_at,
        s.name as service_name,
        s.est_minutes as service_est_minutes,
        u.name as reception_name
      FROM visits v
      LEFT JOIN services s ON v.service_id = s.id
      LEFT JOIN user u ON v.reception_id = u.id
      WHERE v.status = 'new'
      ORDER BY v.created_at ASC
    `).all();

    return c.json(successResponse({
      visits: visitsResult.results.map((visit: any) => ({
        id: visit.id,
        token: visit.token,
        name: visit.name,
        phone: visit.phone,
        service: visit.service_name,
        estimatedMinutes: visit.service_est_minutes,
        notes: visit.notes || null,
        reception: visit.reception_name,
        createdAt: visit.created_at,
      })),
    }));

  } catch (error) {
    console.error('Get pending approvals error:', error);
    return c.json(errorResponse('Failed to fetch pending approvals'), 500);
  }
});

// GET /api/visits/consultant/:consultantId - Get visits assigned to specific consultant
visitsRoutes.get('/consultant/:consultantId', async (c) => {
  try {
    const consultantId = c.req.param('consultantId');
    const utils = createDatabaseUtils(c.env);
    
    const visitsResult = await c.env.DB_PROD.prepare(`
      SELECT 
        v.id, v.token, v.name, v.phone, v.status, v.notes, v.session_notes,
        v.session_start_time, v.created_at, v.updated_at,
        s.name as service_name,
        s.est_minutes as service_est_minutes
      FROM visits v
      LEFT JOIN services s ON v.service_id = s.id
      WHERE v.assigned_consultant_id = ? 
        AND v.status IN ('approved', 'in_session')
      ORDER BY v.created_at ASC
    `).bind(consultantId).all();

    return c.json(successResponse({
      visits: visitsResult.results.map((visit: any) => ({
        id: visit.id,
        token: visit.token,
        name: visit.name,
        phone: visit.phone,
        service: visit.service_name,
        estimatedMinutes: visit.service_est_minutes,
        status: visit.status,
        notes: visit.notes || null,
        sessionNotes: visit.session_notes || null,
        sessionStartTime: visit.session_start_time || null,
        createdAt: visit.created_at,
        updatedAt: visit.updated_at,
      })),
    }));

  } catch (error) {
    console.error('Get consultant visits error:', error);
    return c.json(errorResponse('Failed to fetch consultant visits'), 500);
  }
});

// POST /api/visits - Create new visit (Reception)
visitsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    console.log('🚀 Create visit request body:', JSON.stringify(body, null, 2));
    
    const validatedData = CreateVisitSchema.parse(body);
    console.log('✅ Validated data:', JSON.stringify(validatedData, null, 2));
    
    const utils = createDatabaseUtils(c.env);
    
    // Validate that the service exists
    const serviceCheck = await c.env.DB_PROD.prepare(
      'SELECT id FROM services WHERE id = ?'
    ).bind(validatedData.service_id).first();
    
    if (!serviceCheck) {
      console.error('❌ Service not found:', validatedData.service_id);
      return c.json(errorResponse('Service not found'), 400);
    }
    console.log('✅ Service exists:', serviceCheck);
    
    // Validate that the reception user exists
    const userCheck = await c.env.DB_PROD.prepare(
      'SELECT id, name, role FROM user WHERE id = ?'
    ).bind(validatedData.reception_id).first();
    
    if (!userCheck) {
      console.error('❌ Reception user not found:', validatedData.reception_id);
      return c.json(errorResponse('Reception user not found'), 400);
    }
    console.log('✅ Reception user exists:', userCheck);
    
    // Generate daily token
    const token = await utils.generateDailyToken();
    console.log('✅ Generated token:', token);
    
    // Insert new visit
    const result = await c.env.DB_PROD.prepare(`
      INSERT INTO visits (
        token, name, phone, service_id, status, reception_id, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'new', ?, ?, ?, ?)
    `).bind(
      token,
      validatedData.name,
      validatedData.phone,
      validatedData.service_id,
      validatedData.reception_id,
      validatedData.notes || null,
      utils.getCurrentTimestamp(),
      utils.getCurrentTimestamp()
    ).run();
    console.log('✅ Visit inserted with ID:', result.meta.last_row_id);

    // Get the created visit with service details
    const visitResult = await c.env.DB_PROD.prepare(`
      SELECT v.*, s.name as service_name
      FROM visits v
      LEFT JOIN services s ON v.service_id = s.id
      WHERE v.id = ?
    `).bind(result.meta.last_row_id).first();

    const newVisit = visitResult as any;

    // Log audit trail
    await utils.logAudit('visit', String(result.meta.last_row_id), 'create', validatedData.reception_id, null, {
      token: token,
      name: validatedData.name,
      phone: validatedData.phone,
      service_id: validatedData.service_id,
    });

    // Broadcast real-time event
    try {
      await fetch(`${c.env.BETTER_AUTH_URL || 'http://localhost:8787'}/api/stream/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'visit_created',
          data: {
            visitId: newVisit.id,
            token: newVisit.token,
            name: newVisit.name,
            service: newVisit.service_name,
            status: 'new',
            timestamp: new Date().toISOString(),
          },
          target_roles: ['pa', 'admin'],
        }),
      });
    } catch (broadcastError) {
      console.error('Failed to broadcast visit_created event:', broadcastError);
      // Don't fail the request if broadcast fails
    }

    return c.json(successResponse({
      visit: {
        id: newVisit.id,
        token: newVisit.token,
        name: newVisit.name,
        phone: newVisit.phone,
        service: newVisit.service_name,
        status: newVisit.status,
        notes: newVisit.notes || null,
        createdAt: newVisit.created_at,
      },
    }, 'Visit created successfully'));

  } catch (error) {
    console.error('Create visit error:', error);
    if (error instanceof z.ZodError) {
      return c.json(errorResponse('Validation error: ' + error.errors.map(e => e.message).join(', ')), 400);
    }
    return c.json(errorResponse('Failed to create visit'), 500);
  }
});

// PUT /api/visits/:id/status - Update visit status
visitsRoutes.put('/:id/status', async (c) => {
  try {
    const visitId = c.req.param('id');
    const body = await c.req.json();
    const validatedData = UpdateVisitStatusSchema.parse(body);
    
    const utils = createDatabaseUtils(c.env);
    
    // Get current visit data
    const currentVisit = await c.env.DB_PROD.prepare(
      'SELECT id, status, assigned_consultant_id, pa_id FROM visits WHERE id = ?'
    ).bind(visitId).first();

    if (!currentVisit) {
      return c.json(errorResponse('Visit not found'), 404);
    }

    const visit = currentVisit as any;

    // Build update query
    const updateFields = ['status = ?', 'updated_at = ?'];
    const updateValues = [validatedData.status, utils.getCurrentTimestamp()];

    // Handle status-specific updates
    if (validatedData.status === 'approved' && validatedData.assigned_consultant_id) {
      updateFields.push('assigned_consultant_id = ?');
      updateValues.push(validatedData.assigned_consultant_id);
      
      if (validatedData.pa_id) {
        updateFields.push('pa_id = ?');
        updateValues.push(validatedData.pa_id);
      }
    }

    if (validatedData.status === 'in_session') {
      updateFields.push('session_start_time = ?');
      updateValues.push(utils.getCurrentTimestamp());
    }

    if (validatedData.status === 'completed') {
      updateFields.push('session_end_time = ?');
      updateValues.push(utils.getCurrentTimestamp());
      
      if (validatedData.session_notes) {
        updateFields.push('session_notes = ?');
        updateValues.push(validatedData.session_notes);
      }
    }

    if (validatedData.notes) {
      updateFields.push('notes = ?');
      updateValues.push(validatedData.notes);
    }

    updateValues.push(visitId);

    // Update visit
    await c.env.DB_PROD.prepare(
      `UPDATE visits SET ${updateFields.join(', ')} WHERE id = ?`
    ).bind(...updateValues).run();

    // Get updated visit
    const updatedVisit = await c.env.DB_PROD.prepare(`
      SELECT v.*, s.name as service_name, u.name as consultant_name
      FROM visits v
      LEFT JOIN services s ON v.service_id = s.id
      LEFT JOIN user u ON v.assigned_consultant_id = u.id
      WHERE v.id = ?
    `).bind(visitId).first();

    const result = updatedVisit as any;

    // Log audit trail
    await utils.logAudit('visit', visitId, 'status_update', validatedData.pa_id || validatedData.assigned_consultant_id || 'system', visit, validatedData);

    // Broadcast real-time event
    try {
      const eventType = validatedData.status === 'approved' ? 'visit_approved' : 
                       validatedData.status === 'denied' ? 'visit_denied' :
                       validatedData.status === 'in_session' ? 'visit_in_session' :
                       validatedData.status === 'completed' ? 'visit_completed' : 'visit_status_update';
      
      const targetRoles = validatedData.status === 'approved' ? ['reception', 'consultant', 'admin'] :
                         validatedData.status === 'in_session' ? ['reception', 'pa', 'admin'] :
                         validatedData.status === 'completed' ? ['reception', 'pa', 'admin'] :
                         ['reception', 'pa', 'consultant', 'admin'];

      await fetch(`${c.env.BETTER_AUTH_URL || 'http://localhost:8787'}/api/stream/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          data: {
            visitId: result.id,
            token: result.token,
            name: result.name,
            service: result.service_name,
            status: result.status,
            assignedConsultant: result.consultant_name,
            timestamp: new Date().toISOString(),
          },
          target_roles: targetRoles,
        }),
      });
    } catch (broadcastError) {
      console.error('Failed to broadcast status update event:', broadcastError);
      // Don't fail the request if broadcast fails
    }

    return c.json(successResponse({
      visit: {
        id: result.id,
        token: result.token,
        name: result.name,
        phone: result.phone,
        service: result.service_name,
        status: result.status,
        assignedConsultant: result.consultant_name || null,
        assignedConsultantId: result.assigned_consultant_id || null,
        notes: result.notes || null,
        sessionNotes: result.session_notes || null,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      },
    }, 'Visit status updated successfully'));

  } catch (error) {
    console.error('Update visit status error:', error);
    if (error instanceof z.ZodError) {
      return c.json(errorResponse('Validation error: ' + error.errors.map(e => e.message).join(', ')), 400);
    }
    return c.json(errorResponse('Failed to update visit status'), 500);
  }
});

// GET /api/visits/:id - Get specific visit
visitsRoutes.get('/:id', async (c) => {
  try {
    const visitId = c.req.param('id');
    const utils = createDatabaseUtils(c.env);
    
    const visitResult = await c.env.DB_PROD.prepare(`
      SELECT v.*, s.name as service_name, u.name as consultant_name
      FROM visits v
      LEFT JOIN services s ON v.service_id = s.id
      LEFT JOIN user u ON v.assigned_consultant_id = u.id
      WHERE v.id = ?
    `).bind(visitId).first();

    if (!visitResult) {
      return c.json(errorResponse('Visit not found'), 404);
    }

    const visit = visitResult as any;

    return c.json(successResponse({
      visit: {
        id: visit.id,
        token: visit.token,
        name: visit.name,
        phone: visit.phone,
        service: visit.service_name,
        status: visit.status,
        assignedConsultant: visit.consultant_name || null,
        assignedConsultantId: visit.assigned_consultant_id || null,
        notes: visit.notes || null,
        sessionNotes: visit.session_notes || null,
        waitTime: visit.wait_time_minutes || null,
        sessionStartTime: visit.session_start_time || null,
        sessionEndTime: visit.session_end_time || null,
        createdAt: visit.created_at,
        updatedAt: visit.updated_at,
      },
    }));

  } catch (error) {
    console.error('Get visit error:', error);
    return c.json(errorResponse('Failed to fetch visit'), 500);
  }
});

export { visitsRoutes };