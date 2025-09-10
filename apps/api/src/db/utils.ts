import type { Env } from './index';
import { db } from './index';

// Helper function to create drizzle instance
export function createDb() {
  return db;
}

// Database utility functions
export class DatabaseUtils {
  constructor(private env: Env) {}

  get db() {
    return db;
  }

  // Get current timestamp in ISO format
  getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  // Generate unique token for daily visits
  async generateDailyToken(): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Get today's counter
      const result = await this.env.DB_PROD.prepare(
        'SELECT counter FROM token_counter WHERE date = ?'
      ).bind(today).first<{ counter: number }>();

      let counter = 1;
      if (result?.counter) {
        counter = result.counter + 1;
        await this.env.DB_PROD?.prepare(
          'UPDATE token_counter SET counter = ?, updated_at = ? WHERE date = ?'
        ).bind(counter, this.getCurrentTimestamp(), today).run();
      } else {
        await this.env.DB_PROD?.prepare(
          'INSERT OR REPLACE INTO token_counter (id, date, counter, updated_at) VALUES (1, ?, ?, ?)'
        ).bind(today, counter, this.getCurrentTimestamp()).run();
      }

      return `B-${String(counter).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating daily token:', error);
      throw new Error('Failed to generate daily token');
    }
  }

  // Log audit trail
  async logAudit(
    entity: string,
    entityId: string,
    action: string,
    userId: string,
    oldValues?: object | null,
    newValues?: object | null,
    ipAddress?: string
  ): Promise<void> {
    try {
      await this.env.DB_PROD?.prepare(
        `INSERT INTO audit (entity, entity_id, action, user_id, old_values, new_values, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        entity,
        entityId,
        action,
        userId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null,
        this.getCurrentTimestamp()
      ).run();
    } catch (error) {
      console.error('Error logging audit:', error);
      throw new Error('Failed to log audit trail');
    }
  }
}

// Helper function to create database utils instance
export function createDatabaseUtils(env: Env): DatabaseUtils {
  return new DatabaseUtils(env);
}

// Response helper functions
export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message: message || 'Operation successful',
  };
}

export function errorResponse(message: string, statusCode: number = 400) {
  return {
    success: false,
    error: message,
    statusCode,
  };
}
