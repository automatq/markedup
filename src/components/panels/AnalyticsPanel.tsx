"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, BarChart3, Type, Hash, Clock, FileText, Users, Eye } from "lucide-react";
import { Editor } from "@tiptap/core";

interface AnalyticsPanelProps {
  open: boolean;
  onClose: () => void;
  documentTitle: string;
  documentId?: string;
  editor: Editor | null;
  lastEdited?: Date;
  createdAt?: Date;
  activeUsers?: number;
}

interface ViewEntry {
  userId: string;
  name: string;
  avatar?: string;
  viewedAt: string;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatReadingTime(words: number): string {
  const mins = Math.ceil(words / 200);
  if (mins < 1) return "< 1 min";
  return `${mins} min`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AnalyticsPanel({
  open,
  onClose,
  documentTitle,
  documentId,
  editor,
  lastEdited,
  createdAt,
  activeUsers,
}: AnalyticsPanelProps) {
  const [views, setViews] = useState<ViewEntry[]>([]);

  const stats = useMemo(() => {
    if (!editor) return null;

    const text = editor.getText();
    const json = editor.getJSON();
    const words = countWords(text);
    const characters = text.length;
    const paragraphs =
      json.content?.filter((n) => n.type === "paragraph" && n.content?.length).length ?? 0;
    const headings =
      json.content?.filter((n) => n.type === "heading").length ?? 0;
    const images =
      json.content?.filter((n) => n.type === "image").length ?? 0;
    const tables =
      json.content?.filter((n) => n.type === "table").length ?? 0;
    const codeBlocks =
      json.content?.filter((n) => n.type === "codeBlock").length ?? 0;
    const lists =
      json.content?.filter(
        (n) => n.type === "bulletList" || n.type === "orderedList" || n.type === "taskList"
      ).length ?? 0;

    return {
      words,
      characters,
      paragraphs,
      headings,
      images,
      tables,
      codeBlocks,
      lists,
      readingTime: formatReadingTime(words),
    };
  }, [editor, open]); // recalculate when panel opens

  // Fetch views when panel opens
  useEffect(() => {
    if (!open || !documentId) return;
    fetch(`/api/documents/${documentId}/views`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setViews)
      .catch(() => {});
  }, [open, documentId]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40"
        onClick={onClose}
      />
      <div className="relative ml-auto w-80 h-full border-l border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Page info
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Document title */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-1">
              Document
            </p>
            <p className="text-sm font-medium text-black dark:text-white truncate">
              {documentTitle}
            </p>
          </div>

          {/* Word & character stats */}
          <div className="grid grid-cols-2 gap-2 px-4 py-3">
            <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-3">
              <Type className="h-3.5 w-3.5 text-black/30 dark:text-white/30 mb-1.5" />
              <p className="text-lg font-semibold text-black dark:text-white">
                {stats?.words ?? 0}
              </p>
              <p className="text-[10px] text-black/40 dark:text-white/40">
                Words
              </p>
            </div>
            <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-3">
              <Hash className="h-3.5 w-3.5 text-black/30 dark:text-white/30 mb-1.5" />
              <p className="text-lg font-semibold text-black dark:text-white">
                {stats?.characters ?? 0}
              </p>
              <p className="text-[10px] text-black/40 dark:text-white/40">
                Characters
              </p>
            </div>
            <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-3">
              <Clock className="h-3.5 w-3.5 text-black/30 dark:text-white/30 mb-1.5" />
              <p className="text-lg font-semibold text-black dark:text-white">
                {stats?.readingTime ?? "—"}
              </p>
              <p className="text-[10px] text-black/40 dark:text-white/40">
                Reading time
              </p>
            </div>
            {(activeUsers ?? 0) > 0 && (
              <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-3">
                <Users className="h-3.5 w-3.5 text-black/30 dark:text-white/30 mb-1.5" />
                <p className="text-lg font-semibold text-black dark:text-white">
                  {activeUsers}
                </p>
                <p className="text-[10px] text-black/40 dark:text-white/40">
                  Active now
                </p>
              </div>
            )}
          </div>

          {/* Content breakdown */}
          {stats && (
            <div className="px-4 pb-4">
              <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">
                Content breakdown
              </p>
              <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] divide-y divide-black/6 dark:divide-white/8">
                {[
                  { label: "Paragraphs", count: stats.paragraphs },
                  { label: "Headings", count: stats.headings },
                  { label: "Lists", count: stats.lists },
                  { label: "Code blocks", count: stats.codeBlocks },
                  { label: "Tables", count: stats.tables },
                  { label: "Images", count: stats.images },
                ]
                  .filter((row) => row.count > 0)
                  .map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <span className="text-xs text-black/60 dark:text-white/60">
                        {row.label}
                      </span>
                      <span className="text-xs font-medium text-black dark:text-white">
                        {row.count}
                      </span>
                    </div>
                  ))}
                {stats.paragraphs === 0 &&
                  stats.headings === 0 &&
                  stats.lists === 0 &&
                  stats.codeBlocks === 0 &&
                  stats.tables === 0 &&
                  stats.images === 0 && (
                    <div className="px-3 py-3 text-xs text-black/30 dark:text-white/30 text-center">
                      No content yet
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Viewed by */}
          {views.length > 0 && (
            <div className="px-4 pb-4">
              <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">
                <Eye className="inline h-3 w-3 mr-1 -mt-0.5" />
                Viewed by ({views.length})
              </p>
              <div className="rounded-xl border border-black/6 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] divide-y divide-black/6 dark:divide-white/8">
                {views.map((v) => (
                  <div key={v.userId} className="flex items-center gap-2.5 px-3 py-2">
                    {v.avatar ? (
                      <img
                        src={v.avatar}
                        alt={v.name}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[9px] font-medium text-black/50 dark:text-white/50">
                        {v.name[0]}
                      </div>
                    )}
                    <span className="text-xs text-black/70 dark:text-white/70 flex-1 truncate">
                      {v.name}
                    </span>
                    <span className="text-[10px] text-black/30 dark:text-white/30 shrink-0">
                      {timeAgo(v.viewedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="px-4 pb-4">
            <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">
              Timestamps
            </p>
            <div className="space-y-2">
              {lastEdited && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-black/50 dark:text-white/50">
                    Last edited
                  </span>
                  <span className="text-xs text-black/70 dark:text-white/70">
                    {formatDate(lastEdited)}
                  </span>
                </div>
              )}
              {createdAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-black/50 dark:text-white/50">
                    Created
                  </span>
                  <span className="text-xs text-black/70 dark:text-white/70">
                    {formatDate(createdAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
