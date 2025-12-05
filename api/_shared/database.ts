import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from './db-schema.js';

// Configure Neon for serverless environments
// Set WebSocket constructor for Node.js environment
neonConfig.webSocketConstructor = ws;

// Initialize the database connection
const connectionString = process.env.DATABASE_URL;

export const db = connectionString
  ? drizzle({
      connection: connectionString,
      ws: ws,
      schema
    })
  : (new Proxy({}, {
      get: () => {
        throw new Error("DATABASE_URL is not set");
      }
    }) as any);

// Export schema for convenience
export * from './db-schema.js';
