import { drizzle } from 'drizzle-orm/d1';
import { user } from './schema';
import { db } from './index';

export interface Env {
  DB: D1Database;
  DB_PROD: D1Database;
}

export default {
  async fetch(request: Request, env: Env) {
    const result = await db.select().from(user).all()
    return Response.json(result);
  },
};
