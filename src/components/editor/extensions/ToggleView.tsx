"use client";

import React, { useCallback, useState } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { ChevronRight } from "lucide-react";

export function ToggleView({ node, updateAttributes }: any) {
  const [open, setOpen] = useState<boolean>(node.attrs.open ?? true);
  const [editing, setEditing] = useState(false);
  const summary: string = node.attrs.summary || "Toggle heading";

  const handleToggle = useCallback(() => {
    const next = !open;
    setOpen(next);
    updateAttributes({ open: next });
  }, [open, updateAttributes]);

  const handleSummaryBlur = useCallback(
    (e: React.FocusEvent<HTMLSpanElement>) => {
      const text = e.currentTarget.textContent || "Toggle heading";
      updateAttributes({ summary: text });
      setEditing(false);
    },
    [updateAttributes]
  );

  const handleSummaryKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      }
    },
    []
  );

  return (
    <NodeViewWrapper
      className="rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] my-2"
      data-type="toggle"
    >
      {/* Summary / header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => {
          if (!editing) handleToggle();
        }}
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-black/40 dark:text-white/40 transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        />
        <span
          contentEditable
          suppressContentEditableWarning
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          onFocus={() => setEditing(true)}
          onBlur={handleSummaryBlur}
          onKeyDown={handleSummaryKeyDown}
          className="flex-1 text-sm font-medium text-black dark:text-white/90 outline-none"
        >
          {summary}
        </span>
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
