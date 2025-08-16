import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig } from '@neondatabase/serverless';
import * as schema from './db-schema.js';

// Configure Neon for serverless environments
neonConfig.fetchConnectionCache = true;

// Initialize the database connection
export const db = drizzle(process.env.DATABASE_URL!, { schema });

// Export schema for convenience
export * from './db-schema.js';
