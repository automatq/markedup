"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { TemplatePicker } from "@/components/TemplatePicker";
import { GraphView } from "@/components/graph/GraphView";
import { TrashDialog } from "@/components/dialogs/TrashDialog";
import { useRouter, useParams } from "next/navigation";
import { SessionBriefing } from "@/components/SessionBriefing";

interface DocEntry {
  id: string;
  title: string;
  parentId?: string | null;
  createdBy?: string | null;
  authorName?: string | null;
  tags?: string | null;
  sourceType?: string | null;
}

export default function WorkspaceLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams<{ workspaceId: string; documentId?: string }>();
  const workspaceId = params?.workspaceId ?? "";

  const [documents, setDocuments] = useState<DocEntry[]>([]);
  const [presence, setPresence] = useState<Record<string, { count: number; users: { name: string; avatar?: string; color: string }[] }>>({});
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [graphViewOpen, setGraphViewOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [sessionBriefing, setSessionBriefing] = useState<any>(null);

  const refreshDocuments = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/documents?workspaceId=${workspaceId}`);
      if (res.ok) {
        const docs = await res.json();
        setDocuments(docs);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  }, [workspaceId]);

  // Fetch documents from API + poll every 5s for live updates
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => {
    refreshDocuments();
    const startPolling = () => {
      clearInterval(pollRef.current);
      pollRef.current = setInterval(refreshDocuments, 5000);
    };
    startPolling();

    // Pause polling when tab is hidden, resume + refresh when visible
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(pollRef.current);
      } else {
        refreshDocuments();
        startPolling();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshDocuments]);

  // Poll presence for document list (every 10s)
  const presencePollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => {
    const fetchPresence = async () => {
      if (documents.length === 0) return;
      try {
        const ids = documents.map((d) => d.id).join(",");
        const res = await fetch(`/api/presence?documentIds=${ids}`);
        if (res.ok) setPresence(await res.json());
      } catch {}
    };
    fetchPresence();
    presencePollRef.current = setInterval(fetchPresence, 10000);
    return () => clearInterval(presencePollRef.current);
  }, [documents]);

  // Session check — show "welcome back" briefing if returning after 30+ minutes
  useEffect(() => {
    if (!workspaceId) return;
    fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.isNewSession && data?.briefing) {
          setSessionBriefing(data.briefing);
        }
      })
      .catch(() => {});
  }, [workspaceId]);

  // Cmd+K to open Quick Switcher, Cmd+G for graph
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setQuickSwitcherOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "g") {
        e.preventDefault();
        setGraphViewOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectDocument = useCallback(
    (id: string) => {
      router.push(`/${workspaceId}/${id}`);
    },
    [router, workspaceId]
  );

  const handleCreateDocument = useCallback(() => {
    setTemplatePickerOpen(true);
  }, []);

  const handleTemplateSelect = useCallback(
    async (template: any) => {
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            title: template.title || "Untitled",
            content: template.content || undefined,
            parentId: template.parentId || undefined,
            sourceType: template.sourceType || undefined,
          }),
        });
        if (res.ok) {
          const doc = await res.json();
          setDocuments((prev) => [doc, ...prev]);
          router.push(`/${workspaceId}/${doc.id}`);
        }
      } catch (err) {
        console.error("Failed to create document:", err);
      }
    },
    [router, workspaceId]
  );

  const handleCreateSubPage = useCallback(
    async (parentId: string) => {
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            title: "Untitled",
            parentId,
          }),
        });
        if (res.ok) {
          const doc = await res.json();
          await refreshDocuments();
          router.push(`/${workspaceId}/${doc.id}`);
        }
      } catch (err) {
        console.error("Failed to create sub-page:", err);
      }
    },
    [router, workspaceId, refreshDocuments]
  );

  const handleMoveDocument = useCallback(
    async (docId: string, newParentId: string | null) => {
      try {
        await fetch(`/api/documents/${docId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: newParentId }),
        });
        await refreshDocuments();
      } catch (err) {
        console.error("Failed to move document:", err);
      }
    },
    [refreshDocuments]
  );

  const handleTrashDocument = useCallback(
    async (docId: string) => {
      try {
        await fetch(`/api/documents/${docId}`, { method: "DELETE" });
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        // If we're viewing the trashed doc, go back to workspace
        if (params?.documentId === docId) {
          router.push(`/${workspaceId}`);
        }
      } catch {
        // ignore
      }
    },
    [params?.documentId, router, workspaceId]
  );

  return (
    <>
      <WorkspaceLayout
        documents={documents}
        activeDocumentId={params?.documentId}
        onSelectDocument={handleSelectDocument}
        onCreateDocument={handleCreateDocument}
        onCreateSubPage={handleCreateSubPage}
        onMoveDocument={handleMoveDocument}
        onOpenTrash={() => setTrashOpen(true)}
        onTrashDocument={handleTrashDocument}
        presence={presence}
      >
        {children}
      </WorkspaceLayout>

      {/* Quick Switcher (Cmd+K) */}
      <QuickSwitcher
        open={quickSwitcherOpen}
        onClose={() => setQuickSwitcherOpen(false)}
        documents={documents}
        onSelect={(id) => {
          handleSelectDocument(id);
          setQuickSwitcherOpen(false);
        }}
        onCreate={(title) => {
          handleTemplateSelect({ title });
          setQuickSwitcherOpen(false);
        }}
        workspaceId={workspaceId}
      />

      {/* Template Picker */}
      <TemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={handleTemplateSelect}
      />

      {/* Trash */}
      <TrashDialog
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        workspaceId={workspaceId}
        onRestored={refreshDocuments}
      />

      {/* Session briefing (welcome back) */}
      {sessionBriefing && (
        <SessionBriefing
          briefing={sessionBriefing}
          onClose={() => setSessionBriefing(null)}
          onNavigate={(id) => {
            handleSelectDocument(id);
            setSessionBriefing(null);
          }}
        />
      )}

      {/* Graph View (Cmd+G) */}
      <GraphView
        open={graphViewOpen}
        onClose={() => setGraphViewOpen(false)}
        workspaceId={workspaceId}
        activeNodeId={params?.documentId}
        onNodeClick={(id) => {
          handleSelectDocument(id);
          setGraphViewOpen(false);
        }}
      />
    </>
  );
}
