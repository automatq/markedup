"use client";

import { useCallback, useRef, useState } from "react";
import { Editor } from "@tiptap/core";
import { EditNotification, EditAction } from "./types";

/**
 * Tracks editor transactions and builds a feed of edit notifications.
 * Deduplicates rapid edits from the same user in the same section within a window.
 */
export function useEditNotifications() {
  const [notifications, setNotifications] = useState<EditNotification[]>([]);
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
      const action: EditAction = "edited";

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
