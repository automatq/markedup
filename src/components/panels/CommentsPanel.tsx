"use client";

import React, { useState } from "react";
import { X, Send, Check, MoreHorizontal, MessageSquare } from "lucide-react";

export interface CommentThread {
  id: string;
  text: string;
  author: string;
  authorColor: string;
  timestamp: Date;
  resolved: boolean;
  replies: CommentReply[];
}

interface CommentReply {
  id: string;
  text: string;
  author: string;
  authorColor: string;
  timestamp: Date;
}

const MOCK_THREADS: CommentThread[] = [
  {
    id: "c-1",
    text: "Should we add more detail to the timeline section?",
    author: "Sarah K",
    authorColor: "#ec4899",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    resolved: false,
    replies: [
      { id: "r-1", text: "Yes, let's add milestones for each sprint.", author: "You", authorColor: "#6366f1", timestamp: new Date(Date.now() - 1000 * 60 * 20) },
    ],
  },
  {
    id: "c-2",
    text: "This code example needs updating for v3 API",
    author: "James L",
    authorColor: "#10b981",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    resolved: false,
    replies: [],
  },
  {
    id: "c-3",
    text: "Typo in the third paragraph",
    author: "Sarah K",
    authorColor: "#ec4899",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    resolved: true,
    replies: [
      { id: "r-2", text: "Fixed, thanks!", author: "You", authorColor: "#6366f1", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23) },
    ],
  },
];

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

interface CommentsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function CommentsPanel({ open, onClose }: CommentsPanelProps) {
  const [threads, setThreads] = useState<CommentThread[]>(MOCK_THREADS);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  if (!open) return null;

  const filtered = threads.filter((t) => {
    if (filter === "open") return !t.resolved;
    if (filter === "resolved") return t.resolved;
    return true;
  });

  const handleResolve = (id: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, resolved: !t.resolved } : t))
    );
  };

  const handleReply = (threadId: string) => {
    if (!replyText.trim()) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              replies: [
                ...t.replies,
                {
                  id: `r-${Date.now()}`,
                  text: replyText,
                  author: "You",
                  authorColor: "#6366f1",
                  timestamp: new Date(),
                },
              ],
            }
          : t
      )
    );
    setReplyText("");
    setReplyingTo(null);
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-80 h-full border-l border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Comments</h2>
            <span className="text-[10px] text-black/30 dark:text-white/30">
              {threads.filter((t) => !t.resolved).length} open
            </span>
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

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-black/20 dark:text-white/20">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-xs">No {filter} comments</p>
            </div>
          )}
          {filtered.map((thread) => (
            <div
              key={thread.id}
              className={`border-b border-black/6 dark:border-white/6 px-4 py-3 ${
                thread.resolved ? "opacity-50" : ""
              }`}
            >
              {/* Main comment */}
              <div className="flex items-start gap-2.5">
                <div
                  className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[9px] font-semibold text-white mt-0.5"
                  style={{ backgroundColor: thread.authorColor }}
                >
                  {thread.author[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-black dark:text-white">{thread.author}</span>
                    <span className="text-[10px] text-black/25 dark:text-white/25">{formatTime(thread.timestamp)}</span>
                  </div>
                  <p className="text-xs text-black/70 dark:text-white/70 mt-0.5 leading-relaxed">{thread.text}</p>
                </div>
                <button
                  onClick={() => handleResolve(thread.id)}
                  title={thread.resolved ? "Reopen" : "Resolve"}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
                    thread.resolved
                      ? "text-emerald-500 bg-emerald-500/10"
                      : "text-black/20 dark:text-white/20 hover:text-emerald-500 hover:bg-emerald-500/10"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>

              {/* Replies */}
              {thread.replies.map((reply) => (
                <div key={reply.id} className="flex items-start gap-2.5 mt-2.5 ml-8">
                  <div
                    className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[8px] font-semibold text-white"
                    style={{ backgroundColor: reply.authorColor }}
                  >
                    {reply.author[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-black dark:text-white">{reply.author}</span>
                      <span className="text-[9px] text-black/20 dark:text-white/20">{formatTime(reply.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-black/60 dark:text-white/60 mt-0.5">{reply.text}</p>
                  </div>
                </div>
              ))}

              {/* Reply input */}
              {!thread.resolved && (
                <div className="mt-2 ml-8">
                  {replyingTo === thread.id ? (
                    <div className="flex gap-1.5">
                      <input
                        autoFocus
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleReply(thread.id); if (e.key === "Escape") setReplyingTo(null); }}
                        placeholder="Reply…"
                        className="flex-1 h-7 rounded-md border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-2 text-[11px] text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/20 dark:focus:border-white/25"
                      />
                      <button
                        onClick={() => handleReply(thread.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity"
                      >
                        <Send className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(thread.id)}
                      className="text-[10px] text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors"
                    >
                      Reply…
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
