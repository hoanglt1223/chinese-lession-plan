import { PostgresStorage } from './postgres-storage.js';
import { runMigrations } from './migrate.js';

let initPromise: Promise<void> | null = null;

export async function initializeDatabase(): Promise<void> {
  // Ensure we only initialize once
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Only initialize if DATABASE_URL is configured
      if (!process.env.DATABASE_URL) {
        console.log('📝 DATABASE_URL not configured, skipping database initialization');
        return;
      }

      console.log('🔄 Initializing database...');
      
      // SKIP MIGRATIONS AND USER INIT IN SERVERLESS CONTEXT
      // These operations are too heavy and risky for a simple API call.
      // Migrations should be run manually via `npm run db:migrate`.
      // Default users should also be seeded manually.
      
      /*
      // Run migrations first to ensure tables exist
      await runMigrations();
      
      // Then initialize default users
      const postgresStorage = new PostgresStorage();
      await postgresStorage.initializeDefaultUsers();
      */
      
      console.log('✅ Database connection checked (migrations skipped for serverless)');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      // Don't throw error - allow app to continue with fallback storage
    }
  })();

  return initPromise;
}
