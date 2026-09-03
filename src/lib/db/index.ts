import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/fixmyquery';

const globalForDb = globalThis as unknown as { queryClient?: postgres.Sql };

const queryClient = globalForDb.queryClient ?? postgres(connectionString, { max: 5 });

if (!globalForDb.queryClient) {
  globalForDb.queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
