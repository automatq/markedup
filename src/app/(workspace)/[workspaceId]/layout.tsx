"use client";

import React, { useCallback, useEffect, useState } from "react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { TemplatePicker } from "@/components/TemplatePicker";
import { GraphView, GraphNode, GraphEdge } from "@/components/graph/GraphView";
import { TrashDialog } from "@/components/dialogs/TrashDialog";
import { useRouter, useParams } from "next/navigation";

interface DocEntry {
  id: string;
  title: string;
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
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [graphViewOpen, setGraphViewOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

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

  // Fetch documents from API
  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

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
          }),
        });
        if (res.ok) {
          const doc = await res.json();
          setDocuments((prev) => [doc, ...prev]);
          // Signal the document page to force-apply template content.
          // sessionStorage survives the navigation push but not full page reloads,
          // which is exactly what we want: apply once on first load only.
          if (template.content) {
            try {
              sessionStorage.setItem(
                `template:${doc.id}`,
                JSON.stringify(template.content)
              );
            } catch {
              // sessionStorage may be unavailable in some contexts
            }
          }
          router.push(`/${workspaceId}/${doc.id}`);
        }
      } catch (err) {
        console.error("Failed to create document:", err);
      }
    },
    [router, workspaceId]
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

  // Build graph data from documents
  const graphNodes: GraphNode[] = documents.map((doc, i) => ({
    id: doc.id,
    title: doc.title,
    x: Math.cos((i / Math.max(documents.length, 1)) * Math.PI * 2) * 100,
    y: Math.sin((i / Math.max(documents.length, 1)) * Math.PI * 2) * 100,
    vx: 0,
    vy: 0,
  }));

  return (
    <>
      <WorkspaceLayout
        documents={documents}
        activeDocumentId={params?.documentId}
        onSelectDocument={handleSelectDocument}
        onCreateDocument={handleCreateDocument}
        onOpenTrash={() => setTrashOpen(true)}
        onTrashDocument={handleTrashDocument}
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

      {/* Graph View (Cmd+G) */}
      <GraphView
        open={graphViewOpen}
        onClose={() => setGraphViewOpen(false)}
        nodes={graphNodes}
        edges={[]}
        activeNodeId={params?.documentId}
        onNodeClick={(id) => {
          handleSelectDocument(id);
          setGraphViewOpen(false);
        }}
      />
    </>
  );
}
