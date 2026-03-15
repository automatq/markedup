"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Editor } from "@tiptap/core";
import {
  useSyncStatus,
  useThreads,
  useInboxNotifications,
  useMarkAllInboxNotificationsAsRead,
  useDeleteAllInboxNotifications,
  useMarkInboxNotificationAsRead,
  useOthers,
} from "@liveblocks/react/suspense";
import { MarkedUpEditor } from "@/components/editor/Editor";
import { Room } from "@/components/Room";
import { DocumentHeader } from "@/components/DocumentHeader";
import { toMarkdown } from "@/lib/export/to-markdown";

// Dialogs
import { MoveToDialog } from "@/components/dialogs/MoveToDialog";
import {
  CustomizePageDialog,
  PageCustomization,
  fontClass,
  layoutClass,
} from "@/components/dialogs/CustomizePageDialog";

// Panels
import { VersionHistoryPanel } from "@/components/panels/VersionHistoryPanel";
import { CommentsPanel } from "@/components/panels/CommentsPanel";
import { AnalyticsPanel } from "@/components/panels/AnalyticsPanel";
import { ConnectionsPanel } from "@/components/panels/ConnectionsPanel";
import { NotificationsPanel } from "@/components/panels/NotificationsPanel";
import { AgentsPanel } from "@/components/panels/AgentsPanel";
import { BreakoutPanel } from "@/components/panels/BreakoutPanel";
import { PresentationMode } from "@/components/PresentationMode";

/**
 * Inner document content — rendered inside RoomProvider.
 * Has access to all Liveblocks hooks.
 */
function DocumentInner({
  documentId,
  workspaceId,
  initialTitle,
  initialLastEdited,
  initialCreatedAt,
  initialContent,
}: {
  documentId: string;
  workspaceId: string;
  initialTitle: string;
  initialLastEdited?: Date;
  initialCreatedAt?: Date;
  initialContent?: any;
}) {
  const router = useRouter();
  const { user } = useUser();
  const editorRef = useRef<Editor | null>(null);

  // Liveblocks hooks (must be inside RoomProvider)
  const syncStatus = useSyncStatus({ smooth: true });
  const { threads } = useThreads();
  const { inboxNotifications } = useInboxNotifications();
  const markAllRead = useMarkAllInboxNotificationsAsRead();
  const deleteAllNotifications = useDeleteAllInboxNotifications();
  const markNotificationRead = useMarkInboxNotificationAsRead();

  const others = useOthers();

  // Typing indicator: check who has recently been active (cursor moving)
  const typingUsers = others
    .filter((o) => o.presence?.cursor != null)
    .map((o) => o.info?.name)
    .filter(Boolean);

  const synced = syncStatus === "synchronized";
  const commentCount = threads?.filter((t) => !t.resolved).length ?? 0;
  const unreadNotifCount = inboxNotifications?.filter((n) => n.readAt === null).length ?? 0;
  const activeUsers = (others?.length ?? 0) + 1; // others + self

  // Page state
  const [title, setTitle] = useState(initialTitle);
  const [lastEdited, setLastEdited] = useState<Date | undefined>(initialLastEdited);
  const [smallText, setSmallText] = useState(false);
  const [locked, setLocked] = useState(false);
  const [suggestEdits, setSuggestEdits] = useState(false);
  const [isWiki, setIsWiki] = useState(false);
  const [notifyMe, setNotifyMe] = useState(false);
  const [customization, setCustomization] = useState<PageCustomization>({
    coverUrl: "",
    icon: "",
    font: "geist-mono",
    layout: "full",
  });

  // Scroll progress
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const max = scrollHeight - clientHeight;
    setScrollProgress(max > 0 ? (scrollTop / max) * 100 : 0);
  }, []);

  // Dialog/panel open state
  const [moveToOpen, setMoveToOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [breakoutsOpen, setBreakoutsOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);

  // Record document view
  useEffect(() => {
    fetch(`/api/documents/${documentId}/views`, { method: "POST" }).catch(() => {});
  }, [documentId]);

  // Update lastEdited when sync completes
  useEffect(() => {
    if (synced) {
      setLastEdited(new Date());
    }
  }, [synced]);

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
          try {
            const editor = editorRef.current;
            const body = {
              workspaceId: workspaceId,
              title: `${title} (copy)`,
              content: editor ? editor.getJSON() : undefined,
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
            // Silently handle
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
          setPresentationOpen(true);
          break;

        case "small-text":
          setSmallText((p) => !p);
          break;

        case "full-width":
          // Cycle through layouts: wide → full → narrow → zen → wide
          setCustomization((prev) => {
            const order = ["wide", "full", "narrow", "zen"] as const;
            const idx = order.indexOf(prev.layout);
            const next = order[(idx + 1) % order.length];
            return { ...prev, layout: next };
          });
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

        case "agents":
          setAgentsOpen(true);
          break;

        case "breakouts":
          setBreakoutsOpen((p) => !p);
          break;

        default:
          break;
      }
    },
    [title, workspaceId, documentId, router, handleImport, handleExport]
  );

  const activeFontClass = fontClass(customization.font);

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
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

      {/* Header bar — inside Room so it has access to live presence */}
      <DocumentHeader
        documentId={documentId}
        documentTitle={title}
        synced={synced}
        lastEdited={lastEdited}
        onAction={handleAction}
        notificationCount={unreadNotifCount}
        onNotificationsClick={() => setNotificationsOpen(true)}
        commentCount={commentCount}
        insideRoom={true}
      />

      {/* Content area — editor + inline agents panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor column */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto relative"
        >
          {/* Scroll progress indicator */}
          <div className="sticky top-0 left-0 right-0 h-[2px] z-30 bg-transparent">
            <div
              className="h-full bg-black/15 dark:bg-white/15 transition-[width] duration-100"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
          <div
            className={`mx-auto w-full ${agentsOpen || breakoutsOpen ? "max-w-full px-8" : layoutClass(customization.layout)} py-10 ${activeFontClass}`}
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

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="mx-4 mb-2 flex items-center gap-2 text-[11px] text-black/35 dark:text-white/35 animate-fade-in-up">
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1 w-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1 w-1 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is editing`
                  : typingUsers.length === 2
                    ? `${typingUsers[0]} and ${typingUsers[1]} are editing`
                    : `${typingUsers[0]} and ${typingUsers.length - 1} others are editing`}
              </div>
            )}

            {/* Divider */}
            <div className="mx-4 mb-2 border-t border-black/8 dark:border-white/10" />

            {/* Editor with inline comments */}
            <MarkedUpEditor
              initialContent={initialContent}
              className={smallText ? "text-sm" : ""}
              editable={!locked}
              onEditorReady={handleEditorReady}
            />
          </div>
        </div>

        {/* Inline agents panel — pushes editor left */}
        {agentsOpen && (
          <AgentsPanel
            open={agentsOpen}
            onClose={() => setAgentsOpen(false)}
            getDocumentContent={() => editorRef.current?.getText() ?? ""}
            workspaceId={workspaceId}
            onInsertSuggestion={(text) => {
              const editor = editorRef.current;
              if (!editor) return;
              editor.chain().focus().insertContent(text).run();
            }}
          />
        )}

        {/* Inline breakout files panel */}
        {breakoutsOpen && (
          <BreakoutPanel
            open={breakoutsOpen}
            onClose={() => setBreakoutsOpen(false)}
            documentId={documentId}
            documentTitle={title}
            getDocumentContent={() => editorRef.current?.getText() ?? ""}
            workspaceId={workspaceId}
          />
        )}
      </div>

      {/* ── Dialogs ── */}
      <MoveToDialog
        open={moveToOpen}
        onClose={() => setMoveToOpen(false)}
        documentTitle={title}
        onMove={(destId, destName) => {
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
        documentId={documentId}
        onRestore={(versionId) => {
          setVersionHistoryOpen(false);
        }}
        onPreview={(versionId) => {
          // Preview handled inside panel
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
        documentId={documentId}
        editor={editorRef.current}
        lastEdited={lastEdited}
        createdAt={initialCreatedAt}
        activeUsers={activeUsers}
      />

      <ConnectionsPanel
        open={connectionsOpen}
        onClose={() => setConnectionsOpen(false)}
      />

      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onMarkRead={(id) => markNotificationRead(id)}
        onMarkAllRead={() => markAllRead()}
        onClearAll={() => deleteAllNotifications()}
      />

      {/* Presentation mode overlay */}
      {presentationOpen && (
        <PresentationMode
          html={editorRef.current?.getHTML() ?? ""}
          title={title}
          onClose={() => setPresentationOpen(false)}
        />
      )}

    </div>
  );
}

/**
 * Document page — loads metadata then renders the Room.
 */
export default function DocumentPage() {
  const params = useParams<{ workspaceId: string; documentId: string }>();
  const documentId = params?.documentId ?? "";
  const workspaceId = params?.workspaceId ?? "";

  const [initialTitle, setInitialTitle] = useState("Untitled");
  const [initialLastEdited, setInitialLastEdited] = useState<Date | undefined>(undefined);
  const [initialCreatedAt, setInitialCreatedAt] = useState<Date | undefined>(undefined);
  const [initialContent, setInitialContent] = useState<any>(undefined);
  const [contentLoaded, setContentLoaded] = useState(false);

  // Load document metadata — reset state when documentId changes
  useEffect(() => {
    if (!documentId) return;
    setContentLoaded(false);
    setInitialContent(undefined);
    setInitialTitle("Untitled");
    setInitialLastEdited(undefined);
    setInitialCreatedAt(undefined);

    (async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`);
        if (res.ok) {
          const doc = await res.json();
          if (doc.title) setInitialTitle(doc.title);
          if (doc.updatedAt) setInitialLastEdited(new Date(doc.updatedAt));
          if (doc.createdAt) setInitialCreatedAt(new Date(doc.createdAt));

          // Pass DB content as initialContent — this is a fallback for
          // useLiveblocksExtension. The primary content delivery is
          // server-side Yjs pre-seeding done in POST /api/documents.
          if (doc.content) {
            setInitialContent(doc.content);
          }
        }
      } catch (err) {
        console.error("Failed to load document:", err);
      }
      setContentLoaded(true);
    })();
  }, [documentId]);

  if (!contentLoaded) {
    return (
      <div className="flex items-center justify-center py-20 h-full">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black/60 dark:border-white/20 dark:border-t-white/60" />
      </div>
    );
  }

  // key={documentId} forces full remount of Room + Editor when switching documents
  return (
    <Room key={documentId} roomId={`document:${documentId}`}>
      <DocumentInner
        documentId={documentId}
        workspaceId={workspaceId}
        initialTitle={initialTitle}
        initialLastEdited={initialLastEdited}
        initialCreatedAt={initialCreatedAt}
        initialContent={initialContent}
      />
    </Room>
  );
}
