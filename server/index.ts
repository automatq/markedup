/**
 * Standalone Hocuspocus collaboration server.
 * Deployed separately on Railway.
 */
import { Server } from "@hocuspocus/server";
import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import * as Y from "yjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool as any);
const db = new PrismaClient({ adapter });

const port = parseInt(process.env.PORT ?? "1234", 10);

const server = new Server({
  port,

  async onLoadDocument({ documentName }: { documentName: string }) {
    try {
      const doc = await db.document.findUnique({
        where: { id: documentName },
        select: { yjsState: true },
      });

      if (doc?.yjsState) {
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, new Uint8Array(doc.yjsState));
        return ydoc;
      }
    } catch (err) {
      console.error(`Failed to load document ${documentName}:`, err);
    }

    return new Y.Doc();
  },

  async onStoreDocument({
    documentName,
    document,
  }: {
    documentName: string;
    document: Y.Doc;
  }) {
    try {
      const state = Y.encodeStateAsUpdate(document);
      await db.document.update({
        where: { id: documentName },
        data: { yjsState: Buffer.from(state) },
      });
    } catch (err) {
      console.error(`Failed to store document ${documentName}:`, err);
    }
  },
});

server.listen();
console.log(`Hocuspocus collaboration server running on port ${port}`);
