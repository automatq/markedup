"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";

/**
 * Footnote node view — shows a superscript marker.
 * Click to edit the footnote text in a popover.
 * Footnotes are auto-numbered based on their position in the document.
 */
export function FootnoteView({ node, updateAttributes, getPos, editor }: any) {
  const [editing, setEditing] = useState(!node.attrs.content);
  const [text, setText] = useState<string>(node.attrs.content || "");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Calculate footnote number based on position in document
  const [number, setNumber] = useState(1);

  useEffect(() => {
    if (!editor) return;
    let n = 0;
    const pos = getPos();
    editor.state.doc.descendants((child: any, childPos: number) => {
      if (child.type.name === "footnote") {
        n++;
        if (childPos === pos) {
          setNumber(n);
          return false;
        }
      }
    });
  }, [editor, getPos, editor?.state.doc]);

  // Sync external changes
  useEffect(() => {
    if (!editing) setText(node.attrs.content || "");
  }, [node.attrs.content, editing]);

  const commit = useCallback(() => {
    const trimmed = text.trim();
    updateAttributes({ content: trimmed });
    setEditing(false);
  }, [text, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        commit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setText(node.attrs.content || "");
        setEditing(false);
      }
    },
    [commit, node.attrs.content]
  );

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  return (
    <NodeViewWrapper
      as="span"
      ref={wrapperRef}
      className="relative inline"
      data-type="footnote"
    >
      <span
        onClick={() => setEditing(true)}
        className="inline-flex items-center justify-center min-w-[1rem] h-4 text-[10px] font-semibold rounded-full bg-black/8 dark:bg-white/10 text-black/60 dark:text-white/60 cursor-pointer align-super ml-0.5 hover:bg-black/12 dark:hover:bg-white/15 transition-colors px-1"
        title={node.attrs.content || "Click to add footnote"}
      >
        {number}
      </span>

      {editing && (
        <span className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-xl p-3 animate-fade-in-up">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            placeholder="Footnote text..."
            className="w-full text-sm min-h-[60px] bg-black/[0.03] dark:bg-white/[0.03] rounded-lg p-2 border-none outline-none resize-y text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
            spellCheck
          />
          <p className="text-[10px] text-black/30 dark:text-white/30 mt-1">
            Cmd+Enter to save
          </p>
        </span>
      )}
    </NodeViewWrapper>
  );
}
