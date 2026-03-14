"use client";

import React, { useState } from "react";
import { Sidebar, SidebarDocument } from "../sidebar/Sidebar";

interface WorkspaceLayoutProps {
  documents: SidebarDocument[];
  activeDocumentId?: string;
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  onOpenTrash: () => void;
  children: React.ReactNode;
}

export function WorkspaceLayout({
  documents,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  onOpenTrash,
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
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
