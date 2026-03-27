"use client";

import React from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Film } from "lucide-react";

export function VideoBlockView({ node }: any) {
  const src = node.attrs.src;

  return (
    <NodeViewWrapper
      className="rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] my-2 overflow-hidden"
      data-type="video-block"
    >
      {src ? (
        <video
          src={src}
          controls
          className="w-full max-h-[500px]"
          preload="metadata"
        />
      ) : (
        <div className="flex items-center gap-2 text-black/30 dark:text-white/30 text-sm p-4">
          <Film className="h-4 w-4" />
          No video source
        </div>
      )}
    </NodeViewWrapper>
  );
}
