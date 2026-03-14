"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { ChevronRight } from "lucide-react";

export function ToggleView({ node, updateAttributes }: any) {
  const [open, setOpen] = useState<boolean>(node.attrs.open ?? true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState<string>(node.attrs.summary || "Toggle heading");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync if attribute changes externally (e.g. undo/redo)
  useEffect(() => {
    if (!editing) {
      setName(node.attrs.summary || "Toggle heading");
    }
  }, [node.attrs.summary, editing]);

  const handleToggle = useCallback(() => {
    const next = !open;
    setOpen(next);
    updateAttributes({ open: next });
  }, [open, updateAttributes]);

  const commitName = useCallback(() => {
    const trimmed = name.trim() || "Toggle heading";
    setName(trimmed);
    updateAttributes({ summary: trimmed });
    setEditing(false);
  }, [name, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitName();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setName(node.attrs.summary || "Toggle heading");
        setEditing(false);
      }
    },
    [commitName, node.attrs.summary]
  );

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  return (
    <NodeViewWrapper
      className="rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] my-2"
      data-type="toggle"
    >
      {/* Summary / header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={handleToggle}
          className="shrink-0 p-0 bg-transparent border-none cursor-pointer"
        >
          <ChevronRight
            className={`h-4 w-4 text-black/40 dark:text-white/40 transition-transform duration-200 ${
              open ? "rotate-90" : ""
            }`}
          />
        </button>

        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm font-medium text-black dark:text-white/90 bg-transparent border-none outline-none ring-1 ring-black/10 dark:ring-white/15 rounded px-1.5 py-0.5 -my-0.5"
          />
        ) : (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="flex-1 text-sm font-medium text-black dark:text-white/90 cursor-text hover:ring-1 hover:ring-black/10 dark:hover:ring-white/15 rounded px-1.5 py-0.5 -my-0.5 transition-shadow"
          >
            {name}
          </span>
        )}
      </div>

      {/* Collapsible content */}
      {open && (
        <div className="px-3 pb-3 pl-9">
          <NodeViewContent />
        </div>
      )}
    </NodeViewWrapper>
  );
}
