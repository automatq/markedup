"use client";

import React, { useCallback, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { useParams } from "next/navigation";
import { Database, Loader2, Trash2 } from "lucide-react";
import { DatabaseRoot } from "@/components/database/DatabaseView";

export function DatabaseBlockView({ node, updateAttributes, deleteNode }: any) {
  const params = useParams<{ workspaceId: string; documentId?: string }>();
  const workspaceId = params?.workspaceId ?? "";
  const documentId = params?.documentId ?? null;
  const databaseId = node.attrs.databaseId as string | null;

  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!workspaceId || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          documentId,
          title: "Untitled Database",
        }),
      });
      if (res.ok) {
        const created = await res.json();
        updateAttributes({ databaseId: created.id });
      }
    } catch {}
    setCreating(false);
  }, [workspaceId, documentId, creating, updateAttributes]);

  return (
    <NodeViewWrapper className="my-3" data-type="database-block">
      {!databaseId ? (
        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full flex items-center gap-3 rounded-xl border border-dashed border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-6 text-left hover:border-black/20 dark:hover:border-white/20 transition-all"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            ) : (
              <Database className="h-4 w-4 text-indigo-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-black dark:text-white">
              {creating ? "Creating database…" : "Click to add a database"}
            </p>
            <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">
              Notion-style data with table, board, calendar views
            </p>
          </div>
        </button>
      ) : (
        <div className="relative group">
          <button
            onClick={() => deleteNode()}
            className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 text-black/40 dark:text-white/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
            title="Remove from page"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <DatabaseRoot databaseId={databaseId} />
        </div>
      )}
    </NodeViewWrapper>
  );
}
