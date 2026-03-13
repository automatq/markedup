import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

let _db: PrismaClient | null = null;

function getDb(): PrismaClient {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    // Prisma v7: PrismaNeon is an adapter factory that takes a config object,
    // not a Pool instance. It creates the Pool internally.
    const adapter = new PrismaNeon({ connectionString });
    _db = new PrismaClient({ adapter });
  }
  return _db;
}

// Proxy that lazily initializes on any property access
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
