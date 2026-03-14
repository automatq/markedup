"use client";

import React, { useState } from "react";
import { X, Bell, CheckCheck, Trash2 } from "lucide-react";
import {
  InboxNotification,
  InboxNotificationList,
} from "@liveblocks/react-ui";
import { useInboxNotifications } from "@liveblocks/react/suspense";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export function NotificationsPanel({
  open,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}: NotificationsPanelProps) {
  const { inboxNotifications } = useInboxNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  if (!open) return null;

  const unreadCount = inboxNotifications?.filter((n) => n.readAt === null).length ?? 0;
  const filtered =
    filter === "unread"
      ? inboxNotifications?.filter((n) => n.readAt === null) ?? []
      : inboxNotifications ?? [];

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
            {(inboxNotifications?.length ?? 0) > 0 && (
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
              <p className="text-[10px] mt-1 text-black/15 dark:text-white/15">
                You{"'"}ll be notified when someone mentions you or replies to a thread
              </p>
            </div>
          ) : (
            <InboxNotificationList>
              {filtered.map((notification) => (
                <InboxNotification
                  key={notification.id}
                  inboxNotification={notification}
                  onClick={() => onMarkRead(notification.id)}
                />
              ))}
            </InboxNotificationList>
          )}
        </div>
      </div>
    </div>
  );
}
