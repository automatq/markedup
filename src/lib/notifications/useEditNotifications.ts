"use client";

import { useCallback, useRef, useState } from "react";
import { Editor } from "@tiptap/core";
import { EditNotification, EditAction } from "./types";

/**
 * Tracks editor transactions and builds a feed of edit notifications.
 * Deduplicates rapid edits from the same user in the same section within a window.
 */
export function useEditNotifications() {
  const [notifications, setNotifications] = useState<EditNotification[]>(MOCK_NOTIFICATIONS);
  const debounceMap = useRef<Map<string, number>>(new Map());

  const DEBOUNCE_MS = 3000; // Collapse edits within 3s from same user in same section

  const pushNotification = useCallback(
    (n: Omit<EditNotification, "id" | "timestamp" | "read">) => {
      const key = `${n.userId}:${n.sectionTitle ?? ""}:${n.action}`;
      const now = Date.now();
      const lastTime = debounceMap.current.get(key);

      if (lastTime && now - lastTime < DEBOUNCE_MS) {
        // Update timestamp of existing notification instead of creating new one
        setNotifications((prev) => {
          const idx = prev.findIndex(
            (p) =>
              p.userId === n.userId &&
              p.sectionTitle === n.sectionTitle &&
              p.action === n.action &&
              !p.read
          );
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], timestamp: new Date() };
            return updated;
          }
          return prev;
        });
        debounceMap.current.set(key, now);
        return;
      }

      debounceMap.current.set(key, now);
      const notification: EditNotification = {
        ...n,
        id: `notif-${now}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => [notification, ...prev].slice(0, 100));
    },
    []
  );

  /** Call this when the TipTap editor fires a transaction from a remote user */
  const handleTransaction = useCallback(
    (editor: Editor, userName: string, userColor: string, userId: string) => {
      const { state } = editor;
      const { selection } = state;

      // Walk up from cursor to find the nearest heading for "section" context
      let sectionTitle: string | null = null;
      let nodeType = "paragraph";

      const pos = selection.from;
      state.doc.nodesBetween(0, pos, (node, nodePos) => {
        if (node.type.name === "heading" && nodePos < pos) {
          sectionTitle = node.textContent || null;
        }
      });

      // Determine what node type was affected
      const $pos = state.doc.resolve(pos);
      const parent = $pos.parent;
      if (parent) {
        nodeType = parent.type.name;
      }

      // Determine the action type
      let action: EditAction = "edited";
      const docSize = state.doc.content.size;
      // Heuristic: if doc grew a lot it's likely an "add"
      // For simplicity we default to "edited"

      pushNotification({
        userId,
        userName,
        userColor,
        action,
        sectionTitle,
        nodeType,
      });
    },
    [pushNotification]
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    pushNotification,
    handleTransaction,
    markRead,
    markAllRead,
    clearAll,
  };
}

// ── Mock data so the panel looks populated on first load ──
const MOCK_NOTIFICATIONS: EditNotification[] = [
  {
    id: "n-1",
    userId: "sarah",
    userName: "Sarah K",
    userColor: "#ec4899",
    action: "edited",
    sectionTitle: "Project Timeline",
    nodeType: "paragraph",
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    read: false,
  },
  {
    id: "n-2",
    userId: "james",
    userName: "James L",
    userColor: "#10b981",
    action: "added",
    sectionTitle: "Technical Spec",
    nodeType: "table",
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
    read: false,
  },
  {
    id: "n-3",
    userId: "sarah",
    userName: "Sarah K",
    userColor: "#ec4899",
    action: "commented",
    sectionTitle: "Action Items",
    nodeType: "paragraph",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    read: false,
  },
  {
    id: "n-4",
    userId: "james",
    userName: "James L",
    userColor: "#10b981",
    action: "formatted",
    sectionTitle: "Introduction",
    nodeType: "heading",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: true,
  },
  {
    id: "n-5",
    userId: "sarah",
    userName: "Sarah K",
    userColor: "#ec4899",
    action: "deleted",
    sectionTitle: "Old Notes",
    nodeType: "paragraph",
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    read: true,
  },
  {
    id: "n-6",
    userId: "james",
    userName: "James L",
    userColor: "#10b981",
    action: "added",
    sectionTitle: null,
    nodeType: "codeBlock",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: true,
  },
  {
    id: "n-7",
    userId: "you",
    userName: "You",
    userColor: "#6366f1",
    action: "edited",
    sectionTitle: "Budget Overview",
    nodeType: "table",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    read: true,
  },
  {
    id: "n-8",
    userId: "sarah",
    userName: "Sarah K",
    userColor: "#ec4899",
    action: "added",
    sectionTitle: "Milestones",
    nodeType: "taskList",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
  },
];
