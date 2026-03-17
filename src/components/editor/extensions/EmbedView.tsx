"use client";

import React from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { ExternalLink, X } from "lucide-react";

export function EmbedView({ node, deleteNode }: any) {
  const { src, originalUrl, provider } = node.attrs;

  return (
    <NodeViewWrapper className="my-3">
      <div className="relative rounded-xl overflow-hidden border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/6 dark:border-white/6">
          <span className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium">
            {provider || "embed"}
          </span>
          <div className="flex items-center gap-1">
            {originalUrl && (
              <a
                href={originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors"
              >
                <ExternalLink className="h-3 w-3" /> Open
              </a>
            )}
            <button
              onClick={deleteNode}
              className="flex items-center justify-center h-5 w-5 rounded text-black/20 dark:text-white/20 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Iframe */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
            loading="lazy"
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
