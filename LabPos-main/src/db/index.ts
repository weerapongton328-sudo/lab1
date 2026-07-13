import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema.ts';
import path from 'path';

// For PGLite, the DB is stored as files in a directory.
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'pos_data_pglite');

const client = new PGlite(dbPath);

// Initialize Drizzle ORM
export const db = drizzle(client, { schema });

// In PGLite, there's no pool that needs waiting, it connects immediately.
export const pool = {
  on: () => {}
};
