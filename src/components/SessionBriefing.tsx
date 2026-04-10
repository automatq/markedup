"use client";

import React from "react";
import { X, FileText, Clock, AlertCircle, ArrowRight } from "lucide-react";

interface SessionBriefingData {
  timeAway: string;
  summary: string;
  changes: string[];
  recentDocs: { id: string; title: string; updatedAt: string }[];
  pendingActions: { id: string; title: string; priority: string; status: string }[];
}

interface SessionBriefingProps {
  briefing: SessionBriefingData;
  onClose: () => void;
  onNavigate: (documentId: string) => void;
}

export function SessionBriefing({ briefing, onClose, onNavigate }: SessionBriefingProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-2xl animate-fade-in-up overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-black dark:text-white">
                Welcome back
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-black/40 dark:text-white/40">
                <Clock className="h-3 w-3" />
                <span>Away for {briefing.timeAway}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Summary */}
          <p className="mt-3 text-sm text-black/60 dark:text-white/60 leading-relaxed">
            {briefing.summary}
          </p>
        </div>

        {/* Recent docs */}
        {briefing.recentDocs.length > 0 && (
          <div className="px-6 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-2">
              Recently changed
            </p>
            <div className="space-y-1">
              {briefing.recentDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    onNavigate(doc.id);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors group"
                >
                  <FileText className="h-3.5 w-3.5 text-black/25 dark:text-white/25 shrink-0" />
                  <span className="text-sm text-black/60 dark:text-white/60 truncate flex-1">
                    {doc.title || "Untitled"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-black/15 dark:text-white/15 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pending actions */}
        {briefing.pendingActions.length > 0 && (
          <div className="px-6 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-2">
              Pending actions
            </p>
            <div className="space-y-1">
              {briefing.pendingActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5"
                >
                  <AlertCircle
                    className={`h-3.5 w-3.5 shrink-0 ${
                      action.priority === "urgent" || action.priority === "high"
                        ? "text-red-400"
                        : "text-amber-400"
                    }`}
                  />
                  <span className="text-sm text-black/60 dark:text-white/60 truncate">
                    {action.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dismiss */}
        <div className="px-6 py-4 border-t border-black/6 dark:border-white/6">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-black/[0.05] dark:bg-white/[0.05] px-4 py-2 text-sm font-medium text-black/70 dark:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
