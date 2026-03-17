"use client";

import React, { useEffect, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { ExternalLink, Globe, X } from "lucide-react";

export function BookmarkView({ node, updateAttributes, deleteNode }: any) {
  const { url, title, description, image, favicon } = node.attrs;
  const [loading, setLoading] = useState(!title && !!url);

  // Fetch metadata on mount if not yet loaded
  useEffect(() => {
    if (title || !url) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/embed/meta?url=${encodeURIComponent(url)}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          updateAttributes({
            title: data.title || url,
            description: data.description || "",
            image: data.image || "",
            favicon: data.favicon || "",
          });
        }
      } catch {
        if (!cancelled) updateAttributes({ title: url });
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [url, title, updateAttributes]);

  return (
    <NodeViewWrapper className="my-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex overflow-hidden rounded-xl border border-black/8 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15 transition-colors no-underline"
      >
        {/* Text content */}
        <div className="flex-1 p-4 min-w-0">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 border-2 border-black/20 border-t-black/50 dark:border-white/20 dark:border-t-white/50 rounded-full animate-spin" />
              <span className="text-xs text-black/40 dark:text-white/40">Loading preview...</span>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-black/80 dark:text-white/80 truncate group-hover:text-black dark:group-hover:text-white transition-colors">
                {title || url}
              </p>
              {description && (
                <p className="text-xs text-black/40 dark:text-white/40 mt-1 line-clamp-2">
                  {description}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-2">
                {favicon ? (
                  <img src={favicon} alt="" className="h-3.5 w-3.5 rounded" />
                ) : (
                  <Globe className="h-3 w-3 text-black/25 dark:text-white/25" />
                )}
                <span className="text-[10px] text-black/30 dark:text-white/30 truncate">{url}</span>
                <ExternalLink className="h-2.5 w-2.5 text-black/20 dark:text-white/20 ml-auto shrink-0" />
              </div>
            </>
          )}
        </div>

        {/* Image preview */}
        {image && (
          <div className="w-48 shrink-0 bg-black/[0.03] dark:bg-white/[0.03]">
            <img src={image} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </a>

      {/* Delete button */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNode(); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center justify-center h-5 w-5 rounded bg-white dark:bg-black border border-black/10 dark:border-white/10 text-black/30 dark:text-white/30 hover:text-red-500 shadow transition-all"
      >
        <X className="h-3 w-3" />
      </button>
    </NodeViewWrapper>
  );
}
