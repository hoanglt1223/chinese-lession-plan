import type { Config } from 'drizzle-kit';

export default {
  schema: './api/_shared/db-schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
