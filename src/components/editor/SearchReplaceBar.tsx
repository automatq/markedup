"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/core";
import { X, ChevronUp, ChevronDown, Replace, ReplaceAll } from "lucide-react";
import type { SearchReplaceStorage } from "./extensions/search-replace";

interface SearchReplaceBarProps {
  editor: Editor | null;
}

export function SearchReplaceBar({ editor }: SearchReplaceBarProps) {
  const [open, setOpen] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Listen for Cmd+F / Cmd+H
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setOpen(true);
        setShowReplace(false);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "h") {
        e.preventDefault();
        setOpen(true);
        setShowReplace(true);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Update search when typing
  useEffect(() => {
    if (!editor || !open) return;
    editor.commands.setSearchTerm(search);
  }, [search, editor, open]);

  useEffect(() => {
    if (!editor) return;
    editor.commands.setReplaceTerm(replace);
  }, [replace, editor]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearch("");
    setReplace("");
    editor?.commands.closeSearch();
    editor?.commands.focus();
  }, [editor]);

  const storage = (editor?.storage as any)?.searchReplace as SearchReplaceStorage | undefined;
  const resultCount = storage?.results.length ?? 0;
  const currentIndex = storage?.currentIndex ?? 0;

  if (!open || !editor) return null;

  return (
    <div className="sticky top-0 z-20 border-b border-black/8 dark:border-white/10 bg-white dark:bg-black px-4 py-2 animate-fade-in-up">
      <div className="flex items-center gap-2">
        {/* Search input */}
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.shiftKey
                ? editor.commands.previousSearchResult()
                : editor.commands.nextSearchResult();
            }
            if (e.key === "Escape") handleClose();
          }}
          placeholder="Find..."
          className="w-48 rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1.5 text-xs text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-[#c9a84c] dark:focus:border-[#d4af37]"
        />

        {/* Result count */}
        {search && (
          <span className="text-[10px] text-black/30 dark:text-white/30 whitespace-nowrap">
            {resultCount > 0 ? `${currentIndex + 1} of ${resultCount}` : "No results"}
          </span>
        )}

        {/* Nav buttons */}
        <button onClick={() => editor.commands.previousSearchResult()} title="Previous (Shift+Enter)"
          className="p-1 rounded text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => editor.commands.nextSearchResult()} title="Next (Enter)"
          className="p-1 rounded text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5">
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        {/* Toggle replace */}
        <button
          onClick={() => setShowReplace(!showReplace)}
          title="Toggle replace (Cmd+H)"
          className={`p-1 rounded transition-colors ${showReplace ? "text-[#c9a84c] dark:text-[#d4af37]" : "text-black/40 dark:text-white/40"} hover:bg-black/5 dark:hover:bg-white/5`}
        >
          <Replace className="h-3.5 w-3.5" />
        </button>

        {/* Close */}
        <button onClick={handleClose} className="p-1 rounded text-black/40 dark:text-white/40 hover:bg-black/5 dark:hover:bg-white/5">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") editor.commands.replaceCurrentResult();
              if (e.key === "Escape") handleClose();
            }}
            placeholder="Replace..."
            className="w-48 rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1.5 text-xs text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-[#c9a84c] dark:focus:border-[#d4af37]"
          />
          <button
            onClick={() => editor.commands.replaceCurrentResult()}
            title="Replace"
            className="px-2 py-1 rounded-lg text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 border border-black/10 dark:border-white/10"
          >
            Replace
          </button>
          <button
            onClick={() => editor.commands.replaceAllResults()}
            title="Replace all"
            className="px-2 py-1 rounded-lg text-xs text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 border border-black/10 dark:border-white/10"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}
