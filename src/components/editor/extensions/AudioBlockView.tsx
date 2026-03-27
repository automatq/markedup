"use client";

import React from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Music } from "lucide-react";

export function AudioBlockView({ node }: any) {
  const src = node.attrs.src;

  return (
    <NodeViewWrapper
      className="rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] my-2 p-3"
      data-type="audio-block"
    >
      {src ? (
        <div className="flex items-center gap-3">
          <Music className="h-5 w-5 shrink-0 text-black/30 dark:text-white/30" />
          <audio
            src={src}
            controls
            className="flex-1 h-10"
            preload="metadata"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-black/30 dark:text-white/30 text-sm py-2">
          <Music className="h-4 w-4" />
          No audio source
        </div>
      )}
    </NodeViewWrapper>
  );
}
