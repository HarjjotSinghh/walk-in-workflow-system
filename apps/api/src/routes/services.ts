import { Hono } from 'hono';
import { z } from 'zod';
import { Env } from '../db/index';
import { createDatabaseUtils, successResponse, errorResponse } from '../db/utils';
import { services } from '../db/schema';
import { eq } from 'drizzle-orm';

const servicesRoutes = new Hono<{ Bindings: Env }>();

// Validation schemas
const CreateServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  est_minutes: z.number().int().positive(),
});

const UpdateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  est_minutes: z.number().int().positive().optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});

// GET /api/services - Get all active services
servicesRoutes.get('/', async (c) => {
  try {
    const utils = createDatabaseUtils(c.env);
    
    const servicesResult = await c.env.DB_PROD.prepare(
      'SELECT * FROM services WHERE is_active = 1 ORDER BY name ASC'
    ).all();

    return c.json(successResponse({
      services: servicesResult.results || [],
    }));

  } catch (error) {
    console.error('Get services error:', error);
    return c.json(errorResponse('Failed to fetch services'), 500);
  }
});

// GET /api/services/:id - Get specific service
servicesRoutes.get('/:id', async (c) => {
  try {
    const serviceId = c.req.param('id');
    const utils = createDatabaseUtils(c.env);
    
    const serviceResult = await c.env.DB_PROD.prepare(
      'SELECT * FROM services WHERE id = ?'
    ).bind(serviceId).first();

    if (!serviceResult) {
      return c.json(errorResponse('Service not found'), 404);
    }

    return c.json(successResponse({
      service: serviceResult,
    }));

  } catch (error) {
    console.error('Get service error:', error);
    return c.json(errorResponse('Failed to fetch service'), 500);
  }
});

// POST /api/services - Create new service (Admin only)
servicesRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = CreateServiceSchema.parse(body);
    
    const utils = createDatabaseUtils(c.env);
    
    // Check for duplicate service name
    const existingService = await c.env.DB_PROD.prepare(
      'SELECT id FROM services WHERE name = ? AND is_active = 1'
    ).bind(validatedData.name).first();

    if (existingService) {
      return c.json(errorResponse('Service with this name already exists'), 409);
    }

    // Insert new service
    const result = await c.env.DB_PROD.prepare(`
      INSERT INTO services (name, description, est_minutes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).bind(
      validatedData.name,
      validatedData.description || null,
      validatedData.est_minutes,
      utils.getCurrentTimestamp(),
      utils.getCurrentTimestamp()
    ).run();

    // Get the created service
    const serviceResult = await c.env.DB_PROD.prepare(
      'SELECT * FROM services WHERE id = ?'
    ).bind(result.meta.last_row_id).first();

    // Log audit trail (assuming admin user)
    await utils.logAudit('service', String(result.meta.last_row_id), 'create', 'admin-001', null, validatedData);

    return c.json(successResponse({
      service: serviceResult,
    }, 'Service created successfully'));

  } catch (error) {
    console.error('Create service error:', error);
    if (error instanceof z.ZodError) {
      return c.json(errorResponse('Validation error: ' + error.errors.map(e => e.message).join(', ')), 400);
    }
    return c.json(errorResponse('Failed to create service'), 500);
  }
});

// PUT /api/services/:id - Update service (Admin only)
servicesRoutes.put('/:id', async (c) => {
  try {
    const serviceId = c.req.param('id');
    const body = await c.req.json();
    const validatedData = UpdateServiceSchema.parse(body);
    
    const utils = createDatabaseUtils(c.env);
    
    // Check if service exists
    const existingService = await c.env.DB_PROD.prepare(
      'SELECT * FROM services WHERE id = ?'
    ).bind(serviceId).first();

    if (!existingService) {
      return c.json(errorResponse('Service not found'), 404);
    }

    const oldService = existingService;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (validatedData.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(validatedData.name);
    }
    if (validatedData.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(validatedData.description);
    }
    if (validatedData.est_minutes !== undefined) {
      updateFields.push('est_minutes = ?');
      updateValues.push(validatedData.est_minutes);
    }
    if (validatedData.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(validatedData.is_active);
    }

    updateFields.push('updated_at = ?');
    updateValues.push(utils.getCurrentTimestamp());
    updateValues.push(serviceId);

    // Update service
    await c.env.DB_PROD.prepare(
      `UPDATE services SET ${updateFields.join(', ')} WHERE id = ?`
    ).bind(...updateValues).run();

    // Get updated service
    const updatedService = await c.env.DB_PROD.prepare(
      'SELECT * FROM services WHERE id = ?'
    ).bind(serviceId).first();

    // Log audit trail
    await utils.logAudit('service', serviceId, 'update', 'admin-001', oldService, validatedData);

    return c.json(successResponse({
      service: updatedService,
    }, 'Service updated successfully'));

  } catch (error) {
    console.error('Update service error:', error);
    if (error instanceof z.ZodError) {
      return c.json(errorResponse('Validation error: ' + error.errors.map(e => e.message).join(', ')), 400);
    }
    return c.json(errorResponse('Failed to update service'), 500);
  }
});

// DELETE /api/services/:id - Soft delete service (Admin only)
servicesRoutes.delete('/:id', async (c) => {
  try {
    const serviceId = c.req.param('id');
    const utils = createDatabaseUtils(c.env);
    
    // Check if service exists
    const existingService = await c.env.DB_PROD.prepare(
      'SELECT id, name FROM services WHERE id = ?'
    ).bind(serviceId).first();

    if (!existingService) {
      return c.json(errorResponse('Service not found'), 404);
    }

    // Soft delete by setting is_active to 0
    await c.env.DB_PROD.prepare(
      'UPDATE services SET is_active = 0, updated_at = ? WHERE id = ?'
    ).bind(utils.getCurrentTimestamp(), serviceId).run();

    // Log audit trail
    await utils.logAudit('service', serviceId, 'delete', 'admin-001', existingService as object, { is_active: 0 });

    return c.json(successResponse(null, 'Service deleted successfully'));

  } catch (error) {
    console.error('Delete service error:', error);
    return c.json(errorResponse('Failed to delete service'), 500);
  }
});

export { servicesRoutes };