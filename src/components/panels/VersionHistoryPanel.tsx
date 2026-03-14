"use client";

import React, { useState } from "react";
import { X, RotateCcw, Eye, Clock } from "lucide-react";
import { useHistoryVersions } from "@liveblocks/react/suspense";
import {
  HistoryVersionSummaryList,
  HistoryVersionSummary,
} from "@liveblocks/react-ui";

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
  documentId: string;
  onRestore: (versionId: string) => void;
  onPreview: (versionId: string) => void;
}

export function VersionHistoryPanel({ open, onClose, documentId, onRestore, onPreview }: VersionHistoryPanelProps) {
  const { versions } = useHistoryVersions();
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
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-black/20 dark:text-white/20">
              <History className="h-8 w-8 mb-2" />
              <p className="text-xs">No version history yet</p>
              <p className="text-[10px] mt-1 text-black/15 dark:text-white/15">
                Versions are saved automatically as you edit
              </p>
            </div>
          ) : (
            <HistoryVersionSummaryList>
              {versions.map((version) => (
                <HistoryVersionSummary
                  key={version.createdAt.toISOString()}
                  version={version}
                  onClick={() => {
                    const id = version.createdAt.toISOString();
                    setSelected(id === selected ? null : id);
                  }}
                />
              ))}
            </HistoryVersionSummaryList>
          )}
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
