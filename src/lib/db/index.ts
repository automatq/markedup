import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

let _db: PrismaClient | null = null;

function getDb(): PrismaClient {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool as any);
    _db = new PrismaClient({ adapter });
  }
  return _db;
}

// Proxy that lazily initializes on any property access
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getDb();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
