import path from "node:path";
import { readFileSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Load .env.local for local development
function loadEnv(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    for (const name of [".env.local", ".env"]) {
      const envPath = path.join(__dirname, "..", name);
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        if (key === "DATABASE_URL") {
          let val = line.slice(eq + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          return val;
        }
      }
    }
  } catch {}
  return undefined;
}

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  datasource: {
    url: loadEnv(),
  },
});
