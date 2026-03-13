"use client";

import React, { useState } from "react";
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  Edit3,
  Plus,
  Minus,
  Type,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import {
  EditNotification,
  describeNotification,
} from "@/lib/notifications/types";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: EditNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ActionIcon({ action }: { action: EditNotification["action"] }) {
  const className = "h-3 w-3";
  switch (action) {
    case "edited":
      return <Edit3 className={className} />;
    case "added":
      return <Plus className={className} />;
    case "deleted":
      return <Minus className={className} />;
    case "formatted":
      return <Type className={className} />;
    case "moved":
      return <ArrowRight className={className} />;
    case "commented":
      return <MessageSquare className={className} />;
    default:
      return <Edit3 className={className} />;
  }
}

function actionColor(action: EditNotification["action"]): string {
  switch (action) {
    case "added":
      return "text-emerald-500 bg-emerald-500/10";
    case "deleted":
      return "text-red-400 bg-red-400/10";
    case "commented":
      return "text-amber-500 bg-amber-500/10";
    case "formatted":
      return "text-blue-400 bg-blue-400/10";
    case "moved":
      return "text-purple-400 bg-purple-400/10";
    default:
      return "text-black/40 dark:text-white/40 bg-black/5 dark:bg-white/5";
  }
}

export function NotificationsPanel({
  open,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}: NotificationsPanelProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  if (!open) return null;

  const filtered =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group notifications by relative time bucket
  const groups = groupByTime(filtered);

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40"
        onClick={onClose}
      />
      <div className="relative ml-auto w-96 h-full border-l border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black dark:bg-white px-1.5 text-[10px] font-semibold text-white dark:text-black">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                title="Mark all read"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                title="Clear all"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-black/6 dark:border-white/6">
          {(["all", "unread"] as const).map((f) => (
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
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-1 opacity-60">({unreadCount})</span>
              )}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-black/20 dark:text-white/20">
              <Bell className="h-8 w-8 mb-2" />
              <p className="text-xs">
                {filter === "unread"
                  ? "All caught up!"
                  : "No notifications yet"}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div className="sticky top-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm px-4 py-1.5 border-b border-black/4 dark:border-white/4">
                  <p className="text-[9px] uppercase tracking-widest text-black/25 dark:text-white/25 font-medium">
                    {group.label}
                  </p>
                </div>
                {group.items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onMarkRead(n.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03] ${
                      !n.read
                        ? "bg-black/[0.02] dark:bg-white/[0.02]"
                        : ""
                    }`}
                  >
                    {/* User avatar */}
                    <div className="relative mt-0.5">
                      <div
                        className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                        style={{ backgroundColor: n.userColor }}
                      >
                        {n.userName[0]}
                      </div>
                      {/* Action badge */}
                      <div
                        className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white dark:border-black ${actionColor(n.action)}`}
                      >
                        <ActionIcon action={n.action} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-black/70 dark:text-white/70 leading-relaxed">
                        <span className="font-semibold text-black/90 dark:text-white/90">
                          {n.userName}
                        </span>{" "}
                        {describeNotification(n)}
                      </p>
                      <span className="text-[10px] text-black/25 dark:text-white/25 mt-0.5 block">
                        {formatTime(n.timestamp)}
                      </span>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

interface TimeGroup {
  label: string;
  items: EditNotification[];
}

function groupByTime(items: EditNotification[]): TimeGroup[] {
  const now = Date.now();
  const groups: Record<string, EditNotification[]> = {};

  for (const item of items) {
    const diff = now - item.timestamp.getTime();
    const mins = diff / 60000;
    let label: string;
    if (mins < 60) label = "Just now";
    else if (mins < 60 * 24) label = "Today";
    else if (mins < 60 * 48) label = "Yesterday";
    else label = "Earlier";

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }

  // Maintain order: Just now → Today → Yesterday → Earlier
  const order = ["Just now", "Today", "Yesterday", "Earlier"];
  return order
    .filter((label) => groups[label]?.length)
    .map((label) => ({ label, items: groups[label] }));
}
