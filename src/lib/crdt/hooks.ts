"use client";

import { useEffect, useRef, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { createSyncProvider } from "./provider";

/**
 * React hook that manages a Yjs document lifecycle tied to a document ID.
 * Cleans up the provider on unmount or when documentId changes.
 */
export function useCollaboration(documentId: string) {
  const [synced, setSynced] = useState(false);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  useEffect(() => {
    if (!documentId) return;
    const { ydoc, provider } = createSyncProvider({ documentId });
    ydocRef.current = ydoc;
    providerRef.current = provider;

    provider.on("synced", () => setSynced(true));

    // If we can't connect within 2s, still mark as "synced" so the editor loads
    const fallbackTimer = setTimeout(() => {
      setSynced(true);
    }, 2000);

    return () => {
      clearTimeout(fallbackTimer);
      provider.destroy();
      ydoc.destroy();
      setSynced(false);
    };
  }, [documentId]);

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    synced,
  };
}
