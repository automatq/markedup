"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Search, ArrowRight, Type } from "lucide-react";

export interface QuickSwitcherDocument {
  id: string;
  title: string;
}

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  matchType: "title" | "content";
}

interface QuickSwitcherProps {
  open: boolean;
  onClose: () => void;
  documents: QuickSwitcherDocument[];
  onSelect: (id: string) => void;
  onCreate: (title: string) => void;
  workspaceId?: string;
}

export function QuickSwitcher({
  open,
  onClose,
  documents,
  onSelect,
  onCreate,
  workspaceId,
}: QuickSwitcherProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local title-only filter for instant results
  const filtered = documents.filter((doc) =>
    doc.title.toLowerCase().includes(query.toLowerCase())
  );

  // Full-text search with debounce
  useEffect(() => {
    if (!query.trim() || !workspaceId) {
      setSearchResults(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/documents/search?workspaceId=${workspaceId}&q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch {
        // Silently fail, local results still show
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, workspaceId]);

  // Merge local + search results, deduplicate
  const mergedResults = (() => {
    const localIds = new Set(filtered.map((d) => d.id));
    const contentMatches =
      searchResults?.filter(
        (r) => !localIds.has(r.id) && r.matchType === "content"
      ) ?? [];
    return {
      titleMatches: filtered,
      contentMatches,
    };
  })();

  const totalTitleMatches = mergedResults.titleMatches.length;
  const totalContentMatches = mergedResults.contentMatches.length;

  const showCreate =
    query.length > 0 &&
    !filtered.some((d) => d.title.toLowerCase() === query.toLowerCase());

  const totalItems =
    totalTitleMatches + totalContentMatches + (showCreate ? 1 : 0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setSearchResults(null);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (index: number) => {
      if (index < totalTitleMatches) {
        onSelect(mergedResults.titleMatches[index].id);
        onClose();
      } else if (index < totalTitleMatches + totalContentMatches) {
        onSelect(
          mergedResults.contentMatches[index - totalTitleMatches].id
        );
        onClose();
      } else if (showCreate) {
        onCreate(query);
        onClose();
      }
    },
    [
      mergedResults,
      totalTitleMatches,
      totalContentMatches,
      showCreate,
      query,
      onSelect,
      onCreate,
      onClose,
    ]
  );

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
        handleSelect(selectedIndex);
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [totalItems, selectedIndex, handleSelect, onClose]
  );

  if (!open) return null;

  let itemIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Switcher */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-black/8 dark:border-white/10 px-4 py-3">
          <Search className="h-4 w-4 text-black/30 dark:text-white/30 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents by title or content…"
            className="flex-1 bg-transparent text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none"
          />
          {searching && (
            <span className="text-[10px] text-black/30 dark:text-white/30">
              Searching…
            </span>
          )}
          <kbd className="hidden sm:flex items-center rounded border border-black/10 dark:border-white/10 px-1.5 py-0.5 text-[10px] text-black/30 dark:text-white/30">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-1.5">
          {/* Title matches */}
          {mergedResults.titleMatches.map((doc) => {
            const i = itemIndex++;
            return (
              <button
                key={doc.id}
                onClick={() => handleSelect(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-100 ${
                  i === selectedIndex
                    ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
                    : "text-black/60 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                }`}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-black/30 dark:text-white/30" />
                <span className="truncate">{doc.title}</span>
              </button>
            );
          })}

          {/* Content matches section */}
          {mergedResults.contentMatches.length > 0 && (
            <>
              {totalTitleMatches > 0 && (
                <div className="my-1.5 px-3">
                  <div className="border-t border-black/6 dark:border-white/8" />
                  <p className="text-[10px] text-black/30 dark:text-white/30 mt-2 mb-1 uppercase tracking-wider font-medium">
                    Content matches
                  </p>
                </div>
              )}
              {mergedResults.contentMatches.map((result) => {
                const i = itemIndex++;
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(i)}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-100 ${
                      i === selectedIndex
                        ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
                        : "text-black/60 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <Type className="h-3.5 w-3.5 shrink-0 text-black/20 dark:text-white/20 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-xs">
                        {result.title}
                      </span>
                      {result.snippet && (
                        <span className="block truncate text-xs text-black/40 dark:text-white/40 mt-0.5">
                          {result.snippet}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Create new option */}
          {showCreate && (
            <button
              onClick={() => handleSelect(itemIndex)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-100 ${
                itemIndex === selectedIndex
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

          {totalItems === 0 && (
            <p className="py-6 text-center text-xs text-black/30 dark:text-white/30">
              No documents found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
