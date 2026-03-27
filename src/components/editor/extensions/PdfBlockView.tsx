"use client";

import React from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { FileText } from "lucide-react";

export function PdfBlockView({ node }: any) {
  const src = node.attrs.src;

  return (
    <NodeViewWrapper
      className="rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] my-2 overflow-hidden"
      data-type="pdf-block"
    >
      {src ? (
        <iframe
          src={src}
          className="w-full h-[600px] border-none"
          title="PDF Document"
        />
      ) : (
        <div className="flex items-center gap-2 text-black/30 dark:text-white/30 text-sm p-4">
          <FileText className="h-4 w-4" />
          No PDF source
        </div>
      )}
    </NodeViewWrapper>
  );
}
