"use client";

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import katex from "katex";

export function MathBlockView({ node, updateAttributes }: any) {
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState<string>(node.attrs.content || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync from external changes (undo/redo, collab)
  useEffect(() => {
    if (!editing) {
      setSource(node.attrs.content || "");
    }
  }, [node.attrs.content, editing]);

  const rendered = useMemo(() => {
    try {
      return {
        html: katex.renderToString(source || " ", {
          throwOnError: false,
          displayMode: true,
        }),
        error: null,
      };
    } catch (err: any) {
      return { html: "", error: err.message || "Invalid LaTeX" };
    }
  }, [source]);

  const commit = useCallback(() => {
    const trimmed = source.trim() || "E = mc^2";
    setSource(trimmed);
    updateAttributes({ content: trimmed });
    setEditing(false);
  }, [source, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSource(node.attrs.content || "");
        setEditing(false);
      }
    },
    [commit, node.attrs.content]
  );

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  return (
    <NodeViewWrapper
      className="rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] my-2 p-4"
      data-type="math-block"
    >
      {editing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            rows={Math.max(2, source.split("\n").length)}
            className="w-full font-mono text-sm text-black dark:text-white bg-black/[0.03] dark:bg-white/[0.03] rounded-lg p-3 border border-black/8 dark:border-white/10 outline-none resize-none"
            placeholder="Enter LaTeX equation..."
          />
          {rendered.error && (
            <p className="text-red-500 text-xs mt-1">{rendered.error}</p>
          )}
          <p className="text-[10px] text-black/25 dark:text-white/25 mt-1.5">
            Enter to save · Shift+Enter for newline · Escape to cancel
          </p>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="cursor-pointer text-center overflow-x-auto min-h-[2rem] flex items-center justify-center hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded-lg transition-colors -m-1 p-1"
        >
          {rendered.error ? (
            <div>
              <code className="text-sm text-red-500 font-mono">{source}</code>
              <p className="text-red-400 text-xs mt-1">{rendered.error}</p>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: rendered.html }} />
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}
