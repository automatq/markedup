"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { Link2, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

interface SyncedBlockData {
  id: string;
  content: any;
  label: string | null;
  updatedAt: string;
}

export function SyncedBlockView({ node, updateAttributes, editor: parentEditor, deleteNode }: any) {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId ?? "";
  const blockId = node.attrs.blockId as string | null;

  const [block, setBlock] = useState<SyncedBlockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastSavedContent = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local editor for the synced content
  const innerEditor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, underline: false, undoRedo: false }),
      Underline,
      Highlight,
      Link.configure({ openOnClick: false }),
    ],
    content: { type: "doc", content: [{ type: "paragraph" }] },
    editable: parentEditor?.isEditable ?? true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none text-black/80 dark:text-white/75",
      },
    },
  });

  // Fetch block content
  const fetchBlock = useCallback(async () => {
    if (!blockId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/synced-blocks/${blockId}`);
      if (res.ok) {
        const data = await res.json();
        setBlock(data);
        lastSavedContent.current = JSON.stringify(data.content);
        if (innerEditor && data.content) {
          innerEditor.commands.setContent(data.content, { emitUpdate: false });
        }
      } else if (res.status === 404) {
        setBlock(null);
      }
    } catch {}
    setLoading(false);
  }, [blockId, innerEditor]);

  // Initial fetch
  useEffect(() => {
    if (blockId && innerEditor) {
      setLoading(true);
      fetchBlock();
    } else if (!blockId) {
      setLoading(false);
    }
  }, [blockId, innerEditor, fetchBlock]);

  // Re-poll every 5s for fresh content (to pick up edits from other instances)
  useEffect(() => {
    if (!blockId) return;
    const interval = setInterval(() => {
      fetchBlock();
    }, 5000);
    return () => clearInterval(interval);
  }, [blockId, fetchBlock]);

  // Save changes (debounced)
  useEffect(() => {
    if (!innerEditor || !blockId) return;

    const handleUpdate = () => {
      const json = innerEditor.getJSON();
      const serialized = JSON.stringify(json);
      if (serialized === lastSavedContent.current) return;

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          const res = await fetch(`/api/synced-blocks/${blockId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: json }),
          });
          if (res.ok) {
            lastSavedContent.current = serialized;
          }
        } catch {}
        setSaving(false);
      }, 600);
    };

    innerEditor.on("update", handleUpdate);
    return () => {
      innerEditor.off("update", handleUpdate);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [innerEditor, blockId]);

  const handleCreate = useCallback(async () => {
    if (!workspaceId || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/synced-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (res.ok) {
        const created = await res.json();
        updateAttributes({ blockId: created.id });
      }
    } catch {}
    setCreating(false);
  }, [workspaceId, creating, updateAttributes]);

  return (
    <NodeViewWrapper
      className="my-2 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05] overflow-hidden"
      data-type="synced-block"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-indigo-500/10 bg-indigo-500/[0.04] text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-medium">
        <Link2 className="h-3 w-3" />
        <span>Synced block</span>
        {saving && <Loader2 className="h-2.5 w-2.5 animate-spin ml-1" />}
        <button
          onClick={() => fetchBlock()}
          className="ml-auto opacity-50 hover:opacity-100 transition-opacity"
          title="Refresh"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
        <button
          onClick={() => deleteNode()}
          className="opacity-50 hover:opacity-100 hover:text-red-500 transition-all"
          title="Remove from this page"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="p-4">
        {!blockId ? (
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full text-left text-sm text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 transition-colors"
          >
            {creating ? "Creating synced block…" : "Click to create a new synced block — its content will sync across all references."}
          </button>
        ) : loading ? (
          <div className="flex items-center gap-2 text-xs text-black/30 dark:text-white/30">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading synced content…
          </div>
        ) : !block ? (
          <p className="text-sm text-black/40 dark:text-white/40">
            Synced block not found (it may have been deleted).
          </p>
        ) : (
          <EditorContent editor={innerEditor} />
        )}
      </div>
    </NodeViewWrapper>
  );
}
