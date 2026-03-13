"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Search, ArrowRight } from "lucide-react";

export interface QuickSwitcherDocument {
  id: string;
  title: string;
}

interface QuickSwitcherProps {
  open: boolean;
  onClose: () => void;
  documents: QuickSwitcherDocument[];
  onSelect: (id: string) => void;
  onCreate: (title: string) => void;
}

export function QuickSwitcher({
  open,
  onClose,
  documents,
  onSelect,
  onCreate,
}: QuickSwitcherProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = documents.filter((doc) =>
    doc.title.toLowerCase().includes(query.toLowerCase())
  );

  const showCreate = query.length > 0 && !filtered.some(
    (d) => d.title.toLowerCase() === query.toLowerCase()
  );

  const totalItems = filtered.length + (showCreate ? 1 : 0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % totalItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + totalItems) % totalItems);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex < filtered.length) {
          onSelect(filtered[selectedIndex].id);
          onClose();
        } else if (showCreate) {
          onCreate(query);
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filtered, selectedIndex, totalItems, showCreate, query, onSelect, onCreate, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Switcher */}
      <div className="relative w-full max-w-md mx-4 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-black/8 dark:border-white/10 px-4 py-3">
          <Search className="h-4 w-4 text-black/30 dark:text-white/30 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or create a document…"
            className="flex-1 bg-transparent text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none"
          />
          <kbd className="hidden sm:flex items-center rounded border border-black/10 dark:border-white/10 px-1.5 py-0.5 text-[10px] text-black/30 dark:text-white/30">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto p-1.5">
          {filtered.map((doc, i) => (
            <button
              key={doc.id}
              onClick={() => {
                onSelect(doc.id);
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-100 ${
                i === selectedIndex
                  ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
                  : "text-black/60 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-black/30 dark:text-white/30" />
              <span className="truncate">{doc.title}</span>
            </button>
          ))}

          {/* Create new option */}
          {showCreate && (
            <button
              onClick={() => {
                onCreate(query);
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-100 ${
                selectedIndex === filtered.length
                  ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
                  : "text-black/60 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              }`}
            >
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              <span>
                Create <span className="font-medium">&quot;{query}&quot;</span>
              </span>
            </button>
          )}

          {filtered.length === 0 && !showCreate && (
            <p className="py-6 text-center text-xs text-black/30 dark:text-white/30">
              No documents found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
