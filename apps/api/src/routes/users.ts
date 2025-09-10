import { Hono } from 'hono';
import { z } from 'zod';
import { Env } from '../db/index';
import { createDatabaseUtils, successResponse, errorResponse } from '../db/utils';
import { user } from '../db/schema';
import { eq } from 'drizzle-orm';

const usersRoutes = new Hono<{ Bindings: Env }>();

// Validation schemas
const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['reception', 'pa', 'consultant', 'admin', 'anonymous']),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['reception', 'pa', 'consultant', 'admin', 'anonymous']).optional(),
  is_active: z.number().int().min(0).max(1).optional(),
});

// GET /api/users - Get all users (Admin only)
usersRoutes.get('/', async (c) => {
  try {
    const utils = createDatabaseUtils(c.env);
    
    const usersResult = await c.env.DB_PROD.prepare(
      'SELECT id, email, name, role, is_active, created_at, updated_at FROM user ORDER BY name ASC'
    ).all();

    return c.json(successResponse({
      users: usersResult.results || [],
    }));

  } catch (error) {
    console.error('Get users error:', error);
    return c.json(errorResponse('Failed to fetch users'), 500);
  }
});

// GET /api/users/consultants - Get all active consultants
usersRoutes.get('/consultants', async (c) => {
  try {
    const utils = createDatabaseUtils(c.env);
    
    const consultantsResult = await c.env.DB_PROD.prepare(
      'SELECT id, name, email FROM user WHERE role = ? AND is_active = 1 ORDER BY name ASC'
    ).bind('consultant').all();

    return c.json(successResponse({
      consultants: consultantsResult.results || [],
    }));

  } catch (error) {
    console.error('Get consultants error:', error);
    return c.json(errorResponse('Failed to fetch consultants'), 500);
  }
});

// GET /api/users/:id - Get specific user
usersRoutes.get('/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const utils = createDatabaseUtils(c.env);
    
    const userResult = await c.env.DB_PROD.prepare(
      'SELECT id, email, name, role, is_active, created_at, updated_at FROM user WHERE id = ?'
    ).bind(userId).first();

    if (!userResult) {
      return c.json(errorResponse('User not found'), 404);
    }

    return c.json(successResponse({
      user: userResult,
    }));

  } catch (error) {
    console.error('Get user error:', error);
    return c.json(errorResponse('Failed to fetch user'), 500);
  }
});

// POST /api/users - Create new user (Admin only)
usersRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = CreateUserSchema.parse(body);
    
    const utils = createDatabaseUtils(c.env);
    
    // Check if user already exists
    const existingUser = await c.env.DB_PROD.prepare(
      'SELECT id FROM user WHERE email = ?'
    ).bind(validatedData.email).first();

    if (existingUser) {
      return c.json(errorResponse('User with this email already exists'), 409);
    }

    // Generate user ID
    const userId = `${validatedData.role}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Insert new user
    await c.env.DB_PROD.prepare(`
      INSERT INTO user (id, email, name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).bind(
      userId,
      validatedData.email,
      validatedData.name,
      validatedData.role,
      utils.getCurrentTimestamp(),
      utils.getCurrentTimestamp()
    ).run();

    // Get created user
    const userResult = await c.env.DB_PROD.prepare(
      'SELECT id, email, name, role, is_active, created_at, updated_at FROM user WHERE id = ?'
    ).bind(userId).first();

    // Log audit trail
    await utils.logAudit('user', userId, 'create', 'admin-001', null, validatedData);

    return c.json(successResponse({
      user: userResult,
    }, 'User created successfully'));

  } catch (error) {
    console.error('Create user error:', error);
    if (error instanceof z.ZodError) {
      return c.json(errorResponse('Validation error: ' + error.errors.map(e => e.message).join(', ')), 400);
    }
    return c.json(errorResponse('Failed to create user'), 500);
  }
});

// PUT /api/users/:id - Update user (Admin only)
usersRoutes.put('/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const validatedData = UpdateUserSchema.parse(body);
    
    const utils = createDatabaseUtils(c.env);
    
    // Check if user exists
    const existingUser = await c.env.DB_PROD.prepare(
      'SELECT id, name, role, is_active FROM user WHERE id = ?'
    ).bind(userId).first();

    if (!existingUser) {
      return c.json(errorResponse('User not found'), 404);
    }

    const oldUser = existingUser;

    // Build update query
    const updateFields = [];
    const updateValues = [];

    if (validatedData.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(validatedData.name);
    }
    if (validatedData.role !== undefined) {
      updateFields.push('role = ?');
      updateValues.push(validatedData.role);
    }
    if (validatedData.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(validatedData.is_active);
    }

    updateFields.push('updated_at = ?');
    updateValues.push(utils.getCurrentTimestamp());
    updateValues.push(userId);

    // Update user
    await c.env.DB_PROD.prepare(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`
    ).bind(...updateValues).run();

    // Get updated user
    const updatedUser = await c.env.DB_PROD.prepare(
      'SELECT id, email, name, role, is_active, created_at, updated_at FROM user WHERE id = ?'
    ).bind(userId).first();

    // Log audit trail
    await utils.logAudit('user', userId, 'update', 'admin-001', oldUser, validatedData);

    return c.json(successResponse({
      user: updatedUser,
    }, 'User updated successfully'));

  } catch (error) {
    console.error('Update user error:', error);
    if (error instanceof z.ZodError) {
      return c.json(errorResponse('Validation error: ' + error.errors.map(e => e.message).join(', ')), 400);
    }
    return c.json(errorResponse('Failed to update user'), 500);
  }
});

// DELETE /api/users/:id - Soft delete user (Admin only)
usersRoutes.delete('/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const utils = createDatabaseUtils(c.env);
    
    // Check if user exists
    const existingUser = await c.env.DB_PROD.prepare(
      'SELECT id, name, email FROM user WHERE id = ?'
    ).bind(userId).first();

    if (!existingUser) {
      return c.json(errorResponse('User not found'), 404);
    }

    // Soft delete by setting is_active to 0
    await c.env.DB_PROD.prepare(
      'UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?'
    ).bind(utils.getCurrentTimestamp(), userId).run();

    // Log audit trail
    await utils.logAudit('user', userId, 'delete', 'admin-001', existingUser as object, { is_active: 0 });

    return c.json(successResponse(null, 'User deleted successfully'));

  } catch (error) {
    console.error('Delete user error:', error);
    return c.json(errorResponse('Failed to delete user'), 500);
  }
});

export { usersRoutes };