"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X, Trash2, RotateCcw, Loader2, Clock } from "lucide-react";

interface TrashedDoc {
  id: string;
  title: string;
  deletedAt: string;
  deletedByName?: string | null;
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

/** Days remaining before auto-delete (3-day window) */
function daysRemaining(dateStr: string): number {
  const deleted = new Date(dateStr).getTime();
  const expiry = deleted + 3 * 24 * 60 * 60 * 1000;
  const remaining = expiry - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
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

        {/* Auto-delete notice */}
        <div className="mx-5 mb-3 flex items-center gap-2 rounded-lg bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/15 px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-amber-500/60 shrink-0" />
          <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70">
            Items in trash are automatically deleted after 3 days
          </p>
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
              {docs.map((doc) => {
                const days = daysRemaining(doc.deletedAt);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-xl border border-black/6 dark:border-white/8 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-black/70 dark:text-white/70 truncate">
                        {doc.title || "Untitled"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-black/30 dark:text-white/30">
                          {doc.deletedByName
                            ? `Deleted by ${doc.deletedByName}`
                            : "Deleted"}{" "}
                          {formatDate(doc.deletedAt)}
                        </p>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                          days <= 1
                            ? "bg-red-500/10 text-red-500 dark:text-red-400"
                            : "bg-black/[0.04] dark:bg-white/[0.06] text-black/30 dark:text-white/30"
                        }`}>
                          {days === 0 ? "Expiring soon" : `${days}d left`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => restoreDoc(doc.id)}
                      disabled={actionId === doc.id}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-black/40 dark:text-white/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                      title="Restore"
                    >
                      {actionId === doc.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      Restore
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
