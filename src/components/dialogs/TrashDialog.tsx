"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X, Trash2, RotateCcw, Loader2, AlertTriangle } from "lucide-react";

interface TrashedDoc {
  id: string;
  title: string;
  deletedAt: string;
}

interface TrashDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onRestored?: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function TrashDialog({
  open,
  onClose,
  workspaceId,
  onRestored,
}: TrashDialogProps) {
  const [docs, setDocs] = useState<TrashedDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchTrash = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/documents?workspaceId=${workspaceId}&trash=true`
      );
      if (res.ok) {
        const data = await res.json();
        setDocs(data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    if (open) {
      fetchTrash();
      setConfirmDeleteId(null);
    }
  }, [open, fetchTrash]);

  const restoreDoc = useCallback(
    async (id: string) => {
      setActionId(id);
      try {
        const res = await fetch(`/api/documents/${id}/restore`, {
          method: "POST",
        });
        if (res.ok) {
          setDocs((prev) => prev.filter((d) => d.id !== id));
          onRestored?.();
        }
      } catch {
        // ignore
      }
      setActionId(null);
    },
    [onRestored]
  );

  const permanentDelete = useCallback(async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/documents/${id}/permanent-delete`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      // ignore
    }
    setActionId(null);
    setConfirmDeleteId(null);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md mx-4 max-h-[70vh] rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-base font-semibold text-black dark:text-white">
              Trash
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-black/20 dark:text-white/20" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Trash2 className="h-8 w-8 text-black/10 dark:text-white/10 mb-3" />
              <p className="text-sm text-black/40 dark:text-white/40">
                Trash is empty
              </p>
              <p className="text-[11px] text-black/25 dark:text-white/25 mt-1">
                Deleted documents will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-xl border border-black/6 dark:border-white/8 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black/70 dark:text-white/70 truncate">
                      {doc.title || "Untitled"}
                    </p>
                    <p className="text-[10px] text-black/30 dark:text-white/30">
                      Deleted {formatDate(doc.deletedAt)}
                    </p>
                  </div>

                  {confirmDeleteId === doc.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => permanentDelete(doc.id)}
                        disabled={actionId === doc.id}
                        className="flex items-center gap-1 rounded-lg bg-red-500 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {actionId === doc.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg px-2 py-1 text-[10px] font-medium text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => restoreDoc(doc.id)}
                        disabled={actionId === doc.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                        title="Restore"
                      >
                        {actionId === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(doc.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-black/20 dark:text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
