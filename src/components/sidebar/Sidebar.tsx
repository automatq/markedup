"use client";

import React, { useState } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  FileText,
  Search,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export interface SidebarDocument {
  id: string;
  title: string;
}

interface SidebarProps {
  documents: SidebarDocument[];
  activeDocumentId?: string;
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  documents,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = documents.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-black/8 dark:border-white/10 bg-white dark:bg-black py-3 gap-2">
        <button
          onClick={onToggleCollapse}
          title="Expand sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <button
          onClick={onCreateDocument}
          title="New document"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="mt-auto">
          <ThemeToggle />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-black/8 dark:border-white/10 bg-white dark:bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <h2 className="text-sm font-semibold text-black dark:text-white tracking-tight">
          MarkedUp
        </h2>
        <button
          onClick={onToggleCollapse}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-black/30 dark:text-white/30" />
          <input
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] pl-8 pr-3 text-xs text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/20 dark:focus:border-white/25 transition-colors"
          />
        </div>
      </div>

      {/* New Document */}
      <div className="px-3 pb-2">
        <button
          onClick={onCreateDocument}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 text-xs font-medium text-black/60 dark:text-white/60 hover:border-black/20 hover:bg-black/[0.06] dark:hover:border-white/25 dark:hover:bg-white/[0.07] transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          New Document
        </button>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <div className="space-y-0.5">
          {filtered.map((doc) => (
            <button
              key={doc.id}
              onClick={() => onSelectDocument(doc.id)}
              className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-all duration-150 ${
                doc.id === activeDocumentId
                  ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
                  : "text-black/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black/80 dark:hover:text-white/80"
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{doc.title || "Untitled"}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-black/30 dark:text-white/30">
              No documents found
            </p>
          )}
        </div>
      </div>

      {/* Footer with theme toggle */}
      <div className="border-t border-black/8 dark:border-white/10 px-3 py-2.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30">
          Workspace
        </span>
        <ThemeToggle />
      </div>
    </div>
  );
}
