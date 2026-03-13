"use client";

import { useEffect, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { createSyncProvider } from "./provider";

/**
 * React hook that manages a Yjs document lifecycle tied to a document ID.
 * Cleans up the provider on unmount or when documentId changes.
 */
export function useCollaboration(documentId: string) {
  const [synced, setSynced] = useState(false);
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  useEffect(() => {
    if (!documentId) return;

    const result = createSyncProvider({ documentId });
    setYdoc(result.ydoc);
    setProvider(result.provider);

    result.provider.on("synced", () => setSynced(true));

    // If we can't connect within 2s, still mark as "synced" so the editor loads
    const fallbackTimer = setTimeout(() => {
      setSynced(true);
    }, 2000);

    return () => {
      clearTimeout(fallbackTimer);
      result.provider.destroy();
      result.ydoc.destroy();
      setYdoc(null);
      setProvider(null);
      setSynced(false);
    };
  }, [documentId]);

  return { ydoc, provider, synced };
}
