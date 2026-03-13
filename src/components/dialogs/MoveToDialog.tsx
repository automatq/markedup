"use client";

import React, { useState } from "react";
import { X, FolderInput, ChevronRight, Search } from "lucide-react";

interface Destination {
  id: string;
  name: string;
  type: "workspace" | "folder";
  children?: Destination[];
}

const MOCK_DESTINATIONS: Destination[] = [
  {
    id: "ws-1",
    name: "Personal",
    type: "workspace",
    children: [
      { id: "f-1", name: "Projects", type: "folder" },
      { id: "f-2", name: "Archive", type: "folder" },
    ],
  },
  {
    id: "ws-2",
    name: "Team Engineering",
    type: "workspace",
    children: [
      { id: "f-3", name: "Specs", type: "folder" },
      { id: "f-4", name: "Meeting Notes", type: "folder" },
      { id: "f-5", name: "Runbooks", type: "folder" },
    ],
  },
  {
    id: "ws-3",
    name: "Design",
    type: "workspace",
  },
];

interface MoveToDialogProps {
  open: boolean;
  onClose: () => void;
  documentTitle: string;
  onMove: (destinationId: string, destinationName: string) => void;
}

export function MoveToDialog({ open, onClose, documentTitle, onMove }: MoveToDialogProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ws-1", "ws-2"]));
  const [selected, setSelected] = useState<string | null>(null);

  if (!open) return null;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredDestinations = search
    ? MOCK_DESTINATIONS.flatMap((ws) => {
        const matchChildren = ws.children?.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase())
        ) ?? [];
        if (ws.name.toLowerCase().includes(search.toLowerCase())) return [ws];
        if (matchChildren.length > 0) return [{ ...ws, children: matchChildren }];
        return [];
      })
    : MOCK_DESTINATIONS;

  const selectedName = (() => {
    for (const ws of MOCK_DESTINATIONS) {
      if (ws.id === selected) return ws.name;
      for (const child of ws.children ?? []) {
        if (child.id === selected) return `${ws.name} / ${child.name}`;
      }
    }
    return "";
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-semibold text-black dark:text-white">Move to…</h2>
            <p className="text-xs text-black/40 dark:text-white/40 mt-0.5 truncate max-w-[240px]">{documentTitle}</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-black/30 dark:text-white/30" />
            <input
              placeholder="Search destinations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="h-9 w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] pl-8 pr-3 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/20 dark:focus:border-white/25 transition-colors"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto px-3 pb-2">
          {filteredDestinations.map((ws) => (
            <div key={ws.id}>
              <button
                onClick={() => {
                  if (ws.children?.length) toggleExpand(ws.id);
                  setSelected(ws.id);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  selected === ws.id
                    ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
                    : "text-black/60 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                }`}
              >
                {ws.children?.length ? (
                  <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${expanded.has(ws.id) ? "rotate-90" : ""}`} />
                ) : (
                  <span className="w-3" />
                )}
                <FolderInput className="h-3.5 w-3.5 shrink-0 opacity-40" />
                <span className="truncate font-medium">{ws.name}</span>
              </button>
              {expanded.has(ws.id) && ws.children?.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelected(child.id)}
                  className={`flex w-full items-center gap-2 rounded-lg pl-10 pr-2.5 py-1.5 text-sm transition-colors ${
                    selected === child.id
                      ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
                      : "text-black/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <FolderInput className="h-3 w-3 shrink-0 opacity-30" />
                  <span className="truncate">{child.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-black/8 dark:border-white/10 px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-black/30 dark:text-white/30 truncate max-w-[150px]">
            {selected ? selectedName : "Select a destination"}
          </span>
          <button
            onClick={() => { if (selected) { onMove(selected, selectedName); onClose(); } }}
            disabled={!selected}
            className="rounded-lg bg-black dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Move here
          </button>
        </div>
      </div>
    </div>
  );
}
