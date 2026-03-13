/**
 * Standalone Hocuspocus collaboration server.
 *
 * Run separately from Next.js (e.g., on Railway/Fly.io):
 *   npx tsx src/server/hocuspocus/index.ts
 *
 * Handles Yjs document sync over WebSockets and persists
 * state snapshots back to Neon via Prisma.
 */
import { Server } from "@hocuspocus/server";
import { db } from "@/lib/db";
import * as Y from "yjs";

const port = parseInt(process.env.HOCUSPOCUS_PORT ?? "1234", 10);

const server = new Server({
  port,

  async onLoadDocument({ documentName }: { documentName: string }) {
    const doc = await db.document.findUnique({
      where: { id: documentName },
      select: { yjsState: true },
    });

    if (doc?.yjsState) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, new Uint8Array(doc.yjsState));
      return ydoc;
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
    const state = Y.encodeStateAsUpdate(document);

    await db.document.update({
      where: { id: documentName },
      data: { yjsState: Buffer.from(state) },
    });
  },
});

server.listen();
console.log(`Hocuspocus collaboration server running on port ${port}`);
