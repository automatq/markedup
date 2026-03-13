"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Editor } from "@tiptap/core";
import { MarkedUpEditor } from "@/components/editor/Editor";
import { Room } from "@/components/Room";
import { DocumentHeader } from "@/components/DocumentHeader";
import { toMarkdown } from "@/lib/export/to-markdown";

// Dialogs
import { MoveToDialog } from "@/components/dialogs/MoveToDialog";
import {
  CustomizePageDialog,
  PageCustomization,
} from "@/components/dialogs/CustomizePageDialog";

// Panels
import { VersionHistoryPanel } from "@/components/panels/VersionHistoryPanel";
import { CommentsPanel } from "@/components/panels/CommentsPanel";
import { AnalyticsPanel } from "@/components/panels/AnalyticsPanel";
import { ConnectionsPanel } from "@/components/panels/ConnectionsPanel";
import { NotificationsPanel } from "@/components/panels/NotificationsPanel";

// Notifications
import { useEditNotifications } from "@/lib/notifications/useEditNotifications";

const CURSOR_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6",
];

function randomColor() {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}

export default function DocumentPage() {
  const params = useParams<{ workspaceId: string; documentId: string }>();
  const router = useRouter();
  const documentId = params?.documentId ?? "";
  const workspaceId = params?.workspaceId ?? "";
  const { user } = useUser();
  const editorRef = useRef<Editor | null>(null);
  const [initialContent, setInitialContent] = useState<any>(undefined);
  const [contentLoaded, setContentLoaded] = useState(false);

  // Load document metadata (title + initial content for new docs)
  useEffect(() => {
    if (!documentId) return;
    (async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (res.ok) {
          const doc = await res.json();
          if (doc.content) setInitialContent(doc.content);
          if (doc.title) setTitle(doc.title);
        }
      } catch (err) {
        console.error("Failed to load document:", err);
      }
      setContentLoaded(true);
    })();
  }, [documentId]);

  const userName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "You" : "You";
  const userColor = (user?.unsafeMetadata?.avatarColor as string) ?? "#6366f1";
  const userAvatar = user?.imageUrl;

  const currentPresenceUser = useMemo(() => ({
    name: userName,
    color: userColor,
    avatar: userAvatar,
    isCurrentUser: true,
  }), [userName, userColor, userAvatar]);

  // Notifications
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    clearAll,
  } = useEditNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Page state
  const [title, setTitle] = useState("Untitled");
  const [fullWidth, setFullWidth] = useState(false);
  const [smallText, setSmallText] = useState(false);
  const [locked, setLocked] = useState(false);
  const [suggestEdits, setSuggestEdits] = useState(false);
  const [isWiki, setIsWiki] = useState(false);
  const [notifyMe, setNotifyMe] = useState(false);
  const [customization, setCustomization] = useState<PageCustomization>({
    coverUrl: "",
    icon: "",
    font: "sans",
  });

  // Dialog/panel open state
  const [moveToOpen, setMoveToOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);

  const handleEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const editor = editorRef.current;
      if (editor) {
        // Convert markdown lines into basic content
        // For a real app you'd use a markdown-to-prosemirror parser
        editor.commands.setContent(`<p>${text.replace(/\n/g, "</p><p>")}</p>`);
      }
    };
    input.click();
  }, []);

  const handleExport = useCallback(
    (format: "markdown" | "html") => {
      const editor = editorRef.current;
      if (!editor) return;

      let content: string;
      let mimeType: string;
      let ext: string;

      if (format === "html") {
        content = editor.getHTML();
        mimeType = "text/html";
        ext = "html";
      } else {
        content = toMarkdown(editor.getJSON());
        mimeType = "text/markdown";
        ext = "md";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [title]
  );

  const handleAction = useCallback(
    async (action: string) => {
      switch (action) {
        case "copy-link":
          await navigator.clipboard.writeText(window.location.href);
          break;

        case "copy-contents": {
          const editor = editorRef.current;
          if (editor) {
            const md = toMarkdown(editor.getJSON());
            await navigator.clipboard.writeText(md);
          }
          break;
        }

        case "duplicate": {
          // Create a copy via API and navigate to it
          try {
            const editor = editorRef.current;
            const body = {
              workspaceId: workspaceId,
              title: `${title} (copy)`,
              content: editor ? JSON.stringify(editor.getJSON()) : undefined,
            };
            const res = await fetch("/api/documents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (res.ok) {
              const doc = await res.json();
              router.push(`/${workspaceId}/${doc.id}`);
            }
          } catch {
            // Silently handle – in production you'd show a toast
          }
          break;
        }

        case "move-to":
          setMoveToOpen(true);
          break;

        case "trash": {
          try {
            await fetch(`/api/documents/${documentId}`, {
              method: "DELETE",
            });
          } catch {
            // Best-effort
          }
          router.push(`/${workspaceId}`);
          break;
        }

        case "present":
          document.documentElement.requestFullscreen?.();
          break;

        case "small-text":
          setSmallText((p) => !p);
          break;

        case "full-width":
          setFullWidth((p) => !p);
          break;

        case "customize":
          setCustomizeOpen(true);
          break;

        case "lock":
          setLocked((p) => {
            const next = !p;
            editorRef.current?.setEditable(!next);
            return next;
          });
          break;

        case "suggest-edits":
          setSuggestEdits((p) => !p);
          break;

        case "import":
          handleImport();
          break;

        case "export":
          handleExport("markdown");
          break;

        case "turn-wiki":
          setIsWiki((p) => !p);
          break;

        case "analytics":
          setAnalyticsOpen(true);
          break;

        case "version-history":
          setVersionHistoryOpen(true);
          break;

        case "notify":
          setNotifyMe((p) => !p);
          break;

        case "connections":
          setConnectionsOpen(true);
          break;

        case "comments":
          setCommentsOpen(true);
          break;

        default:
          break;
      }
    },
    [title, workspaceId, documentId, router, handleImport, handleExport]
  );

  const fontClass =
    customization.font === "mono"
      ? "font-mono"
      : customization.font === "serif"
        ? "font-serif"
        : "font-sans";

  return (
    <div className={`flex flex-col h-full animate-fade-in-up ${fontClass}`}>
      {/* Cover image */}
      {customization.coverUrl && (
        <div
          className="h-40 w-full shrink-0"
          style={{ background: customization.coverUrl }}
        />
      )}

      {/* Status badges */}
      {(locked || suggestEdits || isWiki || notifyMe) && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02]">
          {locked && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Locked
            </span>
          )}
          {suggestEdits && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
              Suggesting
            </span>
          )}
          {isWiki && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
              Wiki
            </span>
          )}
          {notifyMe && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Notifications on
            </span>
          )}
        </div>
      )}

      {/* Header bar */}
      <DocumentHeader
        documentId={documentId}
        documentTitle={title}
        provider={null}
        synced={false}
        lastEdited={new Date(Date.now() - 1000 * 60 * 5)}
        onAction={handleAction}
        notificationCount={unreadCount}
        onNotificationsClick={() => setNotificationsOpen(true)}
        currentUser={currentPresenceUser}
      />

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        <div
          className={`mx-auto w-full ${fullWidth ? "max-w-full px-8" : "max-w-3xl"} py-10`}
        >
          {/* Icon + Title */}
          <div className="mb-6 px-4">
            {customization.icon && (
              <div className="text-4xl mb-2">{customization.icon}</div>
            )}
            <h1
              contentEditable={!locked}
              suppressContentEditableWarning
              onBlur={(e) => {
                const newTitle = e.currentTarget.textContent || "Untitled";
                setTitle(newTitle);
                fetch(`/api/documents/${documentId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: newTitle }),
                }).catch(() => {});
              }}
              className="text-2xl font-semibold text-black dark:text-white tracking-tight outline-none"
              data-placeholder="Untitled"
            >
              {title}
            </h1>
            <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-black/10 dark:border-white/10 px-1 py-0.5 text-[9px] normal-case tracking-normal">
                  /
                </kbd>
                <span>commands</span>
              </span>
              <span className="text-black/15 dark:text-white/15">|</span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-black/10 dark:border-white/10 px-1 py-0.5 text-[9px] normal-case tracking-normal">
                  Cmd+K
                </kbd>
                <span>search</span>
              </span>
              <span className="text-black/15 dark:text-white/15">|</span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-black/10 dark:border-white/10 px-1 py-0.5 text-[9px] normal-case tracking-normal">
                  Cmd+G
                </kbd>
                <span>graph</span>
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 mb-2 border-t border-black/8 dark:border-white/10" />

          {/* Editor — wrapped in Liveblocks Room for real-time collaboration */}
          {contentLoaded ? (
            <Room roomId={`document:${documentId}`}>
              <MarkedUpEditor
                initialContent={initialContent}
                className={smallText ? "text-sm" : ""}
                editable={!locked}
                onEditorReady={handleEditorReady}
              />
            </Room>
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black/60 dark:border-white/20 dark:border-t-white/60" />
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      <MoveToDialog
        open={moveToOpen}
        onClose={() => setMoveToOpen(false)}
        documentTitle={title}
        onMove={(destId, destName) => {
          // In production: API call to move document, then navigate
          router.push(`/${workspaceId}`);
        }}
      />

      <CustomizePageDialog
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        current={customization}
        onSave={setCustomization}
      />

      {/* ── Side panels ── */}
      <VersionHistoryPanel
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        onRestore={(versionId) => {
          // In production: fetch version content and set editor content
          setVersionHistoryOpen(false);
        }}
        onPreview={(versionId) => {
          // In production: show diff view
        }}
      />

      <CommentsPanel
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />

      <AnalyticsPanel
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        documentTitle={title}
      />

      <ConnectionsPanel
        open={connectionsOpen}
        onClose={() => setConnectionsOpen(false)}
      />

      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onClearAll={clearAll}
      />
    </div>
  );
}
