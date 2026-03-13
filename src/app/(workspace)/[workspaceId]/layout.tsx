"use client";

import React, { useCallback, useEffect, useState } from "react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { QuickSwitcher } from "@/components/QuickSwitcher";
import { TemplatePicker } from "@/components/TemplatePicker";
import { GraphView, GraphNode, GraphEdge } from "@/components/graph/GraphView";
import { useRouter, useParams } from "next/navigation";

// Mock data — will be replaced with API calls
const mockDocuments = [
  { id: "doc-1", title: "Getting Started" },
  { id: "doc-2", title: "Architecture Notes" },
  { id: "doc-3", title: "Meeting Notes" },
  { id: "doc-4", title: "Project Brief" },
  { id: "doc-5", title: "Daily Journal" },
];

// Mock graph data
const mockGraphNodes: GraphNode[] = mockDocuments.map((doc, i) => ({
  id: doc.id,
  title: doc.title,
  x: Math.cos((i / mockDocuments.length) * Math.PI * 2) * 100,
  y: Math.sin((i / mockDocuments.length) * Math.PI * 2) * 100,
  vx: 0,
  vy: 0,
}));

const mockGraphEdges: GraphEdge[] = [
  { source: "doc-1", target: "doc-2", label: "Architecture Notes" },
  { source: "doc-2", target: "doc-3", label: "Meeting Notes" },
  { source: "doc-3", target: "doc-4", label: "Project Brief" },
  { source: "doc-1", target: "doc-5", label: "Daily Journal" },
];

export default function WorkspaceLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams<{ workspaceId: string; documentId?: string }>();

  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [graphViewOpen, setGraphViewOpen] = useState(false);

  // Cmd+K to open Quick Switcher
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
      router.push(`/${params.workspaceId}/${id}`);
    },
    [router, params.workspaceId]
  );

  const handleCreateDocument = useCallback(() => {
    setTemplatePickerOpen(true);
  }, []);

  const handleTemplateSelect = useCallback(
    (template: any) => {
      // TODO: Create document via API with template content, then navigate
      const newId = `doc-${Date.now()}`;
      console.log("Creating document from template:", template.title, newId);
      router.push(`/${params.workspaceId}/${newId}`);
    },
    [router, params.workspaceId]
  );

  return (
    <>
      <WorkspaceLayout
        documents={mockDocuments}
        activeDocumentId={params.documentId}
        onSelectDocument={handleSelectDocument}
        onCreateDocument={handleCreateDocument}
      >
        {children}
      </WorkspaceLayout>

      {/* Quick Switcher (Cmd+K) */}
      <QuickSwitcher
        open={quickSwitcherOpen}
        onClose={() => setQuickSwitcherOpen(false)}
        documents={mockDocuments}
        onSelect={(id) => {
          handleSelectDocument(id);
          setQuickSwitcherOpen(false);
        }}
        onCreate={(title) => {
          console.log("Creating document:", title);
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
        nodes={mockGraphNodes}
        edges={mockGraphEdges}
        activeNodeId={params.documentId}
        onNodeClick={(id) => {
          handleSelectDocument(id);
          setGraphViewOpen(false);
        }}
      />
    </>
  );
}
