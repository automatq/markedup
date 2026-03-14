"use client";

import React, { useState } from "react";
import { Sidebar, SidebarDocument } from "../sidebar/Sidebar";

interface WorkspaceLayoutProps {
  documents: SidebarDocument[];
  activeDocumentId?: string;
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  onOpenTrash: () => void;
  onTrashDocument: (id: string) => void;
  children: React.ReactNode;
}

export function WorkspaceLayout({
  documents,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  onOpenTrash,
  onTrashDocument,
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
        onOpenTrash={onOpenTrash}
        onTrashDocument={onTrashDocument}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
