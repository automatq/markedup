"use client";

import React, { useCallback, useEffect, useState } from "react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { TemplatePicker } from "@/components/TemplatePicker";
import { GraphView, GraphNode, GraphEdge } from "@/components/graph/GraphView";
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

  // Fetch documents from API
  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      try {
        const res = await fetch(`/api/documents?workspaceId=${workspaceId}`);
        if (res.ok) {
          const docs = await res.json();
          setDocuments(docs);
        }
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      }
    })();
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
