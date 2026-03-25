"use client";

import React, { useEffect, useState } from "react";
import { X, List } from "lucide-react";
import { Editor } from "@tiptap/core";

interface Heading {
  level: number;
  text: string;
  pos: number;
}

interface OutlinePanelProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
}

export function OutlinePanel({ open, onClose, editor }: OutlinePanelProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activePos, setActivePos] = useState(-1);

  useEffect(() => {
    if (!editor || !open) return;

    const update = () => {
      const items: Heading[] = [];
      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === "heading") {
          items.push({
            level: node.attrs.level,
            text: node.textContent,
            pos,
          });
        }
      });
      setHeadings(items);
    };

    update();
    editor.on("update", update);
    return () => { editor.off("update", update); };
  }, [editor, open]);

  // Track which heading is currently visible
  useEffect(() => {
    if (!editor || !open || headings.length === 0) return;

    const checkActive = () => {
      const { from } = editor.state.selection;
      let closest = headings[0];
      for (const h of headings) {
        if (h.pos <= from) closest = h;
      }
      setActivePos(closest.pos);
    };

    checkActive();
    editor.on("selectionUpdate", checkActive);
    return () => { editor.off("selectionUpdate", checkActive); };
  }, [editor, open, headings]);

  if (!open) return null;

  const scrollTo = (pos: number) => {
    if (!editor) return;
    editor.commands.setTextSelection(pos);
    editor.commands.scrollIntoView();
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-80 h-full border-l border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8 dark:border-white/10">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h2 className="text-sm font-semibold text-black dark:text-white">Outline</h2>
            <span className="text-[10px] text-black/30 dark:text-white/30">
              {headings.length} headings
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Outline tree */}
        <div className="flex-1 overflow-y-auto p-3">
          {headings.length === 0 ? (
            <p className="text-xs text-black/30 dark:text-white/30 text-center py-8">
              No headings found. Add headings to see the document outline.
            </p>
          ) : (
            <nav className="space-y-0.5">
              {headings.map((h, i) => (
                <button
                  key={`${h.pos}-${i}`}
                  onClick={() => scrollTo(h.pos)}
                  className={`flex w-full items-center text-left rounded-lg px-2 py-1.5 text-sm transition-colors ${
                    activePos === h.pos
                      ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white font-medium"
                      : "text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                  }`}
                  style={{ paddingLeft: `${8 + (h.level - 1) * 16}px` }}
                >
                  <span className="text-[9px] font-mono text-black/20 dark:text-white/20 mr-2 w-4 shrink-0">
                    H{h.level}
                  </span>
                  <span className="truncate">{h.text || "Untitled"}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
