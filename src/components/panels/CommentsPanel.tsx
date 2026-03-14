"use client";

import React, { useState } from "react";
import { X, MessageSquare } from "lucide-react";
import { Thread } from "@liveblocks/react-ui";
import { useThreads } from "@liveblocks/react/suspense";

interface CommentsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function CommentsPanel({ open, onClose }: CommentsPanelProps) {
  const { threads } = useThreads();
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  if (!open) return null;

  const filtered = threads.filter((t) => {
    if (filter === "open") return !t.resolved;
    if (filter === "resolved") return t.resolved;
    return true;
  });

  const openCount = threads.filter((t) => !t.resolved).length;

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-96 h-full border-l border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Comments</h2>
            {openCount > 0 && (
              <span className="text-[10px] text-black/30 dark:text-white/30">
                {openCount} open
              </span>
            )}
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-1 px-4 py-2 border-b border-black/6 dark:border-white/6">
          {(["open", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Thread list — uses Liveblocks Thread component */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-black/20 dark:text-white/20">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-xs">
                {threads.length === 0
                  ? "No comments yet"
                  : `No ${filter} comments`}
              </p>
              {threads.length === 0 && (
                <p className="text-[10px] mt-1 text-black/15 dark:text-white/15">
                  Select text in the editor and use the comment button to start a thread
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-black/6 dark:divide-white/6">
              {filtered.map((thread) => (
                <Thread
                  key={thread.id}
                  thread={thread}
                  className="px-2"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
