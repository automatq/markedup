"use client";

import React, { useEffect, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { List } from "lucide-react";

interface Heading {
  level: number;
  text: string;
  pos: number;
}

export function TableOfContentsView({ editor }: any) {
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    if (!editor) return;

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
  }, [editor]);

  const scrollTo = (pos: number) => {
    editor.commands.setTextSelection(pos);
    editor.commands.scrollIntoView();
  };

  return (
    <NodeViewWrapper>
      <div className="my-4 rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3 text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
          <List className="h-3.5 w-3.5" />
          Table of Contents
        </div>
        {headings.length === 0 ? (
          <p className="text-xs text-black/30 dark:text-white/30 italic">
            Add headings to your document to generate a table of contents.
          </p>
        ) : (
          <nav className="space-y-1">
            {headings.map((h, i) => (
              <button
                key={`${h.pos}-${i}`}
                onClick={() => scrollTo(h.pos)}
                className="block w-full text-left text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors truncate"
                style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
              >
                {h.text || "Untitled"}
              </button>
            ))}
          </nav>
        )}
      </div>
    </NodeViewWrapper>
  );
}
