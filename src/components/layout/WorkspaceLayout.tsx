"use client";

import React, { useState } from "react";
import { Sidebar, SidebarDocument } from "../sidebar/Sidebar";

interface WorkspaceLayoutProps {
  documents: SidebarDocument[];
  activeDocumentId?: string;
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  onCreateSubPage?: (parentId: string) => void;
  onMoveDocument?: (docId: string, newParentId: string | null) => void;
  onOpenTrash: () => void;
  onTrashDocument: (id: string) => void;
  presence?: Record<string, { count: number; users: { name: string; avatar?: string; color: string }[] }>;
  children: React.ReactNode;
}

export function WorkspaceLayout({
  documents,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  onCreateSubPage,
  onMoveDocument,
  onOpenTrash,
  onTrashDocument,
  presence,
  children,
}: WorkspaceLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-black transition-colors duration-200">
      <Sidebar
        documents={documents}
        activeDocumentId={activeDocumentId}
        onSelectDocument={onSelectDocument}
        onCreateDocument={onCreateDocument}
        onCreateSubPage={onCreateSubPage}
        onMoveDocument={onMoveDocument}
        onOpenTrash={onOpenTrash}
        onTrashDocument={onTrashDocument}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        presence={presence}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
