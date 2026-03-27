"use client";

import React, { useCallback, useState } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";

const EMOJI_OPTIONS = ["💡", "ℹ️", "⚠️", "❗", "✅", "❌", "📌", "🔥", "💬", "📝", "🎯", "⭐"];

export function CalloutView({ node, updateAttributes }: any) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const emoji = node.attrs.emoji || "💡";

  const handleEmojiSelect = useCallback(
    (e: string) => {
      updateAttributes({ emoji: e });
      setPickerOpen(false);
    },
    [updateAttributes]
  );

  return (
    <NodeViewWrapper
      className="border-l-2 border-black/20 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.03] rounded-r-lg my-2 relative"
      data-callout=""
    >
      <div className="flex gap-2 p-4">
        {/* Emoji picker button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setPickerOpen(!pickerOpen)}
            className="text-lg leading-none hover:scale-110 transition-transform cursor-pointer select-none"
            contentEditable={false}
            title="Change icon"
          >
            {emoji}
          </button>
          {pickerOpen && (
            <div
              className="absolute top-8 left-0 z-50 grid grid-cols-6 gap-1 p-2 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-xl"
              contentEditable={false}
            >
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => handleEmojiSelect(e)}
                  className="text-lg w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
