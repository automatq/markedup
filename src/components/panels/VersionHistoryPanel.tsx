"use client";

import React, { useState } from "react";
import { X, RotateCcw, Eye, Clock } from "lucide-react";

export interface VersionEntry {
  id: string;
  timestamp: Date;
  author: string;
  authorColor: string;
  summary: string;
  isCurrent?: boolean;
}

const MOCK_VERSIONS: VersionEntry[] = [
  { id: "v-1", timestamp: new Date(Date.now() - 1000 * 60 * 5), author: "You", authorColor: "#6366f1", summary: "Updated project timeline table", isCurrent: true },
  { id: "v-2", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), author: "Sarah K", authorColor: "#ec4899", summary: "Added action items section" },
  { id: "v-3", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), author: "You", authorColor: "#6366f1", summary: "Reorganized headings" },
  { id: "v-4", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), author: "James L", authorColor: "#10b981", summary: "Initial draft" },
  { id: "v-5", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), author: "You", authorColor: "#6366f1", summary: "Created page from template" },
];

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

interface VersionHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  onRestore: (versionId: string) => void;
  onPreview: (versionId: string) => void;
}

export function VersionHistoryPanel({ open, onClose, onRestore, onPreview }: VersionHistoryPanelProps) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-80 h-full border-l border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Version history</h2>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            {MOCK_VERSIONS.map((version) => (
              <button
                key={version.id}
                onClick={() => setSelected(version.id === selected ? null : version.id)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  selected === version.id
                    ? "bg-black/[0.04] dark:bg-white/[0.04]"
                    : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                      style={{ backgroundColor: version.authorColor }}
                    >
                      {version.author[0]}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-black dark:text-white truncate">
                        {version.author}
                      </span>
                      {version.isCurrent && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-black/50 dark:text-white/50 mt-0.5 truncate">
                      {version.summary}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-black/30 dark:text-white/30">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(version.timestamp)}
                    </div>

                    {/* Actions when selected */}
                    {selected === version.id && !version.isCurrent && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onPreview(version.id); }}
                          className="flex items-center gap-1.5 rounded-md border border-black/8 dark:border-white/10 px-2.5 py-1 text-[10px] font-medium text-black/50 dark:text-white/50 hover:border-black/20 dark:hover:border-white/25 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onRestore(version.id); }}
                          className="flex items-center gap-1.5 rounded-md bg-black dark:bg-white px-2.5 py-1 text-[10px] font-medium text-white dark:text-black hover:opacity-80 transition-opacity"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restore
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function History(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
    </svg>
  );
}
