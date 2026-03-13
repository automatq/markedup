"use client";

import React, { useState } from "react";
import { MoreHorizontal, Share2, MessageSquare, Clock, Bell } from "lucide-react";
import { PresenceAvatars, PresenceUser } from "./presence/PresenceAvatars";
import { ShareDialog } from "./ShareDialog";
import { PageActionsMenu } from "./PageActionsMenu";

interface DocumentHeaderProps {
  documentId: string;
  documentTitle: string;
  provider?: any;
  synced: boolean;
  lastEdited?: Date;
  onAction: (action: string) => void;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  currentUser?: PresenceUser;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DocumentHeader({
  documentId,
  documentTitle,
  provider,
  synced,
  lastEdited,
  onAction,
  notificationCount = 0,
  onNotificationsClick,
  currentUser,
}: DocumentHeaderProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentCount] = useState(3); // Mock

  return (
    <>
      <div className="flex items-center justify-between border-b border-black/8 dark:border-white/10 px-4 py-2">
        {/* Left side — breadcrumb + sync status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30">
            {synced ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Saved
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Syncing
              </span>
            )}
          </div>
        </div>

        {/* Right side — presence, last edited, actions */}
        <div className="flex items-center gap-2">
          {/* Last edited */}
          {lastEdited && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-black/30 dark:text-white/30 mr-1">
              <Clock className="h-3 w-3" />
              <span>Edited {formatRelativeTime(lastEdited)}</span>
            </div>
          )}

          {/* Presence avatars */}
          <PresenceAvatars provider={provider} currentUser={currentUser} />

          {/* Notifications bell */}
          <button
            onClick={onNotificationsClick}
            className="relative flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Bell className="h-3.5 w-3.5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-semibold text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>

          {/* Comment count badge */}
          <button
            onClick={() => onAction("comments")}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {commentCount > 0 && <span>{commentCount}</span>}
          </button>

          {/* Share button */}
          <button
            onClick={() => setShareOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-black dark:bg-white px-3 text-xs font-medium text-white dark:text-black hover:opacity-80 transition-opacity"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>

          {/* 3-dot menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/8 dark:border-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/25 transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            <PageActionsMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              onAction={onAction}
            />
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentTitle={documentTitle}
        documentId={documentId}
      />
    </>
  );
}
