"use client";

import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from "@hocuspocus/provider";
import * as Y from "yjs";

export interface SyncProviderOptions {
  documentId: string;
  serverUrl?: string;
}

/**
 * Creates a Yjs document + Hocuspocus WebSocket provider pair.
 * The provider auto-reconnects and syncs state with the collaboration server.
 * Works offline if the server is unreachable.
 */
export function createSyncProvider({
  documentId,
  serverUrl = process.env.NEXT_PUBLIC_COLLAB_URL ?? "ws://localhost:1234",
}: SyncProviderOptions) {
  const ydoc = new Y.Doc();

  // Create the websocket layer with generous retry config so it doesn't spam
  const websocketProvider = new HocuspocusProviderWebsocket({
    url: serverUrl,
    maxAttempts: 5,
    delay: 2000,
  });

  const provider = new HocuspocusProvider({
    websocketProvider,
    name: documentId,
    document: ydoc,
    onConnect: () => {
      // Connected successfully
    },
    onClose: () => {
      // Connection closed — editor continues offline via local Yjs doc
    },
  });

  return { ydoc, provider };
}
