"use client";

import React, { useEffect, useState } from "react";
import { X, ArrowUpLeft, FileText } from "lucide-react";

interface Backlink {
  id: string;
  linkText: string;
  sourceDocument: {
    id: string;
    title: string;
  };
}

interface BacklinksPanelProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  onNavigate: (documentId: string) => void;
}

export function BacklinksPanel({ open, onClose, documentId, onNavigate }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !documentId) return;
    setLoading(true);
    fetch(`/api/backlinks?documentId=${documentId}`)
      .then((res) => res.ok ? res.json() : [])
      .then(setBacklinks)
      .catch(() => setBacklinks([]))
      .finally(() => setLoading(false));
  }, [open, documentId]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-80 h-full border-l border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
          <div className="flex items-center gap-2">
            <ArrowUpLeft className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Backlinks</h2>
            <span className="text-[10px] text-black/30 dark:text-white/30">
              {backlinks.length} linking
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="text-xs text-black/30 dark:text-white/30 text-center py-8">Loading...</p>
          ) : backlinks.length === 0 ? (
            <p className="text-xs text-black/30 dark:text-white/30 text-center py-8">
              No other documents link to this page yet.
            </p>
          ) : (
            <div className="space-y-1">
              {backlinks.map((bl) => (
                <button
                  key={bl.id}
                  onClick={() => {
                    onNavigate(bl.sourceDocument.id);
                    onClose();
                  }}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 mt-0.5 text-black/30 dark:text-white/30 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-black/70 dark:text-white/70 truncate">
                      {bl.sourceDocument.title || "Untitled"}
                    </p>
                    <p className="text-[10px] text-black/30 dark:text-white/30 truncate">
                      via "{bl.linkText}"
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
