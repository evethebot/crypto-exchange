import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://vmansus@localhost:5432/crypto_exchange';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export default db;
