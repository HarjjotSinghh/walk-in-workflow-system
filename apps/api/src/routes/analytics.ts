import { Hono } from 'hono';
import { z } from 'zod';
import { Env } from '../db/index';
import { createDatabaseUtils, successResponse, errorResponse } from '../db/utils';

const analyticsRoutes = new Hono<{ Bindings: Env }>();

// Validation schemas
const DateRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// GET /api/analytics/dashboard - Get dashboard statistics
analyticsRoutes.get('/dashboard', async (c) => {
  try {
    const env = c.env
    const utils = createDatabaseUtils(env);
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's stats using raw SQL for complex aggregations
    const todayStats = await env.DB_PROD.prepare(`
      SELECT 
        COUNT(*) as total_visits,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_visits,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_visits,
        SUM(CASE WHEN status = 'in_session' THEN 1 ELSE 0 END) as in_session_visits,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_visits,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied_visits
      FROM visits 
      WHERE date(created_at) = ?
    `).bind(today).first();

    // Get weekly stats (last 7 days)
    const weeklyStats = await env.DB_PROD.prepare(`
      SELECT 
        date(created_at) as visit_date,
        COUNT(*) as total_visits,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_visits
      FROM visits 
      WHERE date(created_at) >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY visit_date ASC
    `).all();

    // Get service statistics
    const serviceStats = await env.DB_PROD.prepare(`
      SELECT 
        s.name as service_name,
        COUNT(v.id) as total_visits,
        SUM(CASE WHEN v.status = 'completed' THEN 1 ELSE 0 END) as completed_visits,
        AVG(
          CASE WHEN v.session_start_time IS NOT NULL AND v.session_end_time IS NOT NULL 
          THEN (julianday(v.session_end_time) - julianday(v.session_start_time)) * 24 * 60
          ELSE NULL END
        ) as avg_session_minutes
      FROM services s
      LEFT JOIN visits v ON s.id = v.service_id AND date(v.created_at) >= date('now', '-30 days')
      WHERE s.is_active = 1
      GROUP BY s.id, s.name
      ORDER BY total_visits DESC
    `).all();

    // Get consultant performance
    const consultantStats = await env.DB_PROD.prepare(`
      SELECT 
        u.name as consultant_name,
        COUNT(v.id) as total_assigned,
        SUM(CASE WHEN v.status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
        AVG(
          CASE WHEN v.session_start_time IS NOT NULL AND v.session_end_time IS NOT NULL 
          THEN (julianday(v.session_end_time) - julianday(v.session_start_time)) * 24 * 60
          ELSE NULL END
        ) as avg_session_minutes
      FROM user u
      LEFT JOIN visits v ON u.id = v.assigned_consultant_id AND date(v.created_at) >= date('now', '-30 days')
      WHERE u.role = 'consultant' AND u.is_active = 1
      GROUP BY u.id, u.name
      ORDER BY completed_sessions DESC
    `).all();

    return c.json(successResponse({
      today: todayStats || {
        total_visits: 0,
        new_visits: 0,
        approved_visits: 0,
        in_session_visits: 0,
        completed_visits: 0,
        denied_visits: 0,
      },
      weekly: weeklyStats.results || [],
      services: serviceStats.results || [],
      consultants: consultantStats.results || [],
    }));

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    return c.json(errorResponse('Failed to fetch dashboard analytics'), 500);
  }
});

// GET /api/analytics/export - Export data for specific date range
analyticsRoutes.get('/export', async (c) => {
  try {
    const startDate = c.req.query('start_date') || new Date().toISOString().split('T')[0];
    const endDate = c.req.query('end_date') || new Date().toISOString().split('T')[0];
    
    // Validate date format
    const validatedDates = DateRangeSchema.parse({
      start_date: startDate,
      end_date: endDate,
    });

    const env = c.env;
    const utils = createDatabaseUtils(env);
    
    // Validate date format
    const exportData = await env.DB_PROD.prepare(`
      SELECT 
        date(v.created_at) as visit_date,
        v.token,
        v.name as visitor_name,
        v.phone,
        s.name as service_name,
        v.status,
        u1.name as consultant_name,
        u2.name as pa_name,
        u3.name as reception_name,
        v.wait_time_minutes,
        CASE WHEN v.session_start_time IS NOT NULL AND v.session_end_time IS NOT NULL 
        THEN ROUND((julianday(v.session_end_time) - julianday(v.session_start_time)) * 24 * 60)
        ELSE NULL END as session_duration_minutes,
        v.created_at,
        v.session_start_time,
        v.session_end_time,
        v.notes,
        v.session_notes
      FROM visits v
      LEFT JOIN services s ON v.service_id = s.id
      LEFT JOIN user u1 ON v.assigned_consultant_id = u1.id
      LEFT JOIN user u2 ON v.pa_id = u2.id
      LEFT JOIN user u3 ON v.reception_id = u3.id
      WHERE date(v.created_at) BETWEEN ? AND ?
      ORDER BY v.created_at DESC
    `).bind(validatedDates.start_date, validatedDates.end_date).all();

    // Convert to CSV format
    const csvHeaders = [
      'Date',
      'Token',
      'Visitor Name',
      'Phone',
      'Service',
      'Status',
      'Consultant',
      'PA',
      'Reception',
      'Wait Time (min)',
      'Session Duration (min)',
      'Created At',
      'Session Start',
      'Session End',
      'Notes',
      'Session Notes'
    ];

    const csvRows = (exportData.results || []).map((row: any) => [
      row.visit_date,
      row.token,
      row.visitor_name,
      row.phone,
      row.service_name,
      row.status,
      row.consultant_name || '',
      row.pa_name || '',
      row.reception_name || '',
      row.wait_time_minutes || '',
      row.session_duration_minutes || '',
      row.created_at,
      row.session_start_time || '',
      row.session_end_time || '',
      (row.notes || '').replace(/"/g, '""'),
      (row.session_notes || '').replace(/"/g, '""')
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="wiws-visits-${validatedDates.start_date}-to-${validatedDates.end_date}.csv"`,
      },
    });

  } catch (error) {
    console.error('Export data error:', error);
    if (error instanceof z.ZodError) {
      return c.json(errorResponse('Invalid date format. Use YYYY-MM-DD'), 400);
    }
    return c.json(errorResponse('Failed to export data'), 500);
  }
});

// GET /api/analytics/audit - Get audit trail (Admin only)
analyticsRoutes.get('/admin/audit', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;
    
    const env = c.env
    const utils = createDatabaseUtils(env);
    
    // Get audit records with user names
    const auditRecords = await env.DB_PROD.prepare(`
      SELECT 
        a.id,
        a.entity,
        a.entity_id,
        a.action,
        u.name as user_name,
        a.old_values,
        a.new_values,
        a.ip_address,
        a.created_at
      FROM audit a
      LEFT JOIN user u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    // Get total count for pagination
    const totalCount = await env.DB_PROD.prepare(
      'SELECT COUNT(*) as total FROM audit'
    ).first();

    return c.json(successResponse({
      records: (auditRecords.results || []).map((record: any) => ({
        id: record.id,
        entity: record.entity,
        entityId: record.entity_id,
        action: record.action,
        userName: record.user_name,
        oldValues: record.old_values ? JSON.parse(record.old_values) : null,
        newValues: record.new_values ? JSON.parse(record.new_values) : null,
        ipAddress: record.ip_address,
        createdAt: record.created_at,
      })),
      pagination: {
        page,
        limit,
        total: (totalCount as any)?.total || 0,
        totalPages: Math.ceil(((totalCount as any)?.total || 0) / limit),
      },
    }));

  } catch (error) {
    console.error('Get audit trail error:', error);
    return c.json(errorResponse('Failed to fetch audit trail'), 500);
  }
});

// GET /api/analytics/audit - Get audit trail for compliance
analyticsRoutes.get('/audit', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const entity = c.req.query('entity'); // Filter by entity type
    const entityId = c.req.query('entity_id'); // Filter by specific entity
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    let whereConditions = [];
    let params = [];

    const env = c.env;
    
    if (entity) {
      whereConditions.push('entity = ?');
      params.push(entity);
    }
    
    if (entityId) {
      whereConditions.push('entity_id = ?');
      params.push(entityId);
    }
    
    if (startDate) {
      whereConditions.push('date(created_at) >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('date(created_at) <= ?');
      params.push(endDate);
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Get audit records with user info
    const auditRecords = await env.DB_PROD.prepare(`
      SELECT 
        a.id,
        a.entity,
        a.entity_id,
        a.action,
        a.old_values,
        a.new_values,
        a.ip_address,
        a.created_at,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM audit a
      LEFT JOIN user u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();
    
    // Get total count for pagination
    const countResult = await env.DB_PROD.prepare(`
      SELECT COUNT(*) as total
      FROM audit a
      ${whereClause}
    `).bind(...params).first();
    
    const total = (countResult as any)?.total || 0;
    const totalPages = Math.ceil(total / limit);
    
    return c.json(successResponse({
      audit_records: (auditRecords.results || []).map((record: any) => ({
        id: record.id,
        entity: record.entity,
        entityId: record.entity_id,
        action: record.action,
        oldValues: record.old_values ? JSON.parse(record.old_values) : null,
        newValues: record.new_values ? JSON.parse(record.new_values) : null,
        ipAddress: record.ip_address,
        createdAt: record.created_at,
        user: {
          name: record.user_name,
          email: record.user_email,
          role: record.user_role,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }));
    
  } catch (error) {
    console.error('Get audit trail error:', error);
    return c.json(errorResponse('Failed to fetch audit trail'), 500);
  }
});

export { analyticsRoutes };