"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";

let mermaidInstance: any = null;
let mermaidLoading = false;
const mermaidCallbacks: (() => void)[] = [];

async function getMermaid() {
  if (mermaidInstance) return mermaidInstance;
  if (mermaidLoading) {
    return new Promise<any>((resolve) => {
      mermaidCallbacks.push(() => resolve(mermaidInstance));
    });
  }
  mermaidLoading = true;
  const mod = await import("mermaid");
  mermaidInstance = mod.default;
  mermaidInstance.initialize({ startOnLoad: false, theme: "default" });
  mermaidLoading = false;
  mermaidCallbacks.forEach((cb) => cb());
  mermaidCallbacks.length = 0;
  return mermaidInstance;
}

export function MermaidBlockView({ node, updateAttributes }: any) {
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState<string>(node.attrs.content || "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const renderIdRef = useRef(0);

  // Sync from external changes
  useEffect(() => {
    if (!editing) {
      setSource(node.attrs.content || "");
    }
  }, [node.attrs.content, editing]);

  // Render diagram
  useEffect(() => {
    const currentSource = node.attrs.content || source;
    if (!currentSource.trim()) {
      setSvg("");
      setError(null);
      return;
    }

    const renderId = ++renderIdRef.current;

    (async () => {
      try {
        const mermaid = await getMermaid();
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg: rendered } = await mermaid.render(id, currentSource);
        if (renderId === renderIdRef.current) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err: any) {
        if (renderId === renderIdRef.current) {
          setError(err.message || "Invalid Mermaid syntax");
          setSvg("");
        }
      }
    })();
  }, [node.attrs.content, editing ? null : source]);

  const commit = useCallback(() => {
    const trimmed = source.trim() || "graph TD\n  A[Start] --> B[End]";
    setSource(trimmed);
    updateAttributes({ content: trimmed });
    setEditing(false);
  }, [source, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
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
      data-type="mermaid-block"
    >
      {editing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            rows={Math.max(4, source.split("\n").length + 1)}
            className="w-full font-mono text-sm text-black dark:text-white bg-black/[0.03] dark:bg-white/[0.03] rounded-lg p-3 border border-black/8 dark:border-white/10 outline-none resize-none"
            placeholder="Enter Mermaid diagram syntax..."
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          <p className="text-[10px] text-black/25 dark:text-white/25 mt-1.5">
            Cmd+Enter to save · Escape to cancel
          </p>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="cursor-pointer flex justify-center overflow-x-auto min-h-[3rem] items-center hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded-lg transition-colors -m-1 p-1"
        >
          {error ? (
            <div className="text-center">
              <code className="text-sm text-black/50 dark:text-white/40 font-mono whitespace-pre-wrap">{source}</code>
              <p className="text-red-400 text-xs mt-1">{error}</p>
            </div>
          ) : svg ? (
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <p className="text-sm text-black/30 dark:text-white/30">Loading diagram...</p>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}
