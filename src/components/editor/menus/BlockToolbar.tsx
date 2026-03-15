"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Editor } from "@tiptap/core";
import {
  Trash2,
  Copy,
  Columns2,
  Rows2,
  GripVertical,
} from "lucide-react";

interface BlockToolbarProps {
  editor: Editor;
}

type ActiveBlock =
  | { type: "table" }
  | { type: "callout" | "toggle" | "codeBlock" | "image" | "blockquote" }
  | null;

function ToolbarButton({
  onClick,
  title,
  children,
  destructive,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor blur
        onClick();
      }}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
        destructive
          ? "text-red-400 hover:text-red-500 hover:bg-red-500/10"
          : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

export function BlockToolbar({ editor }: BlockToolbarProps) {
  const [activeBlock, setActiveBlock] = useState<ActiveBlock>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const updateToolbar = () => {
      if (!editor.isFocused) {
        // Don't hide immediately — user might be clicking toolbar
        return;
      }

      let block: ActiveBlock = null;

      if (editor.isActive("table")) {
        block = { type: "table" };
      } else if (editor.isActive("callout")) {
        block = { type: "callout" };
      } else if (editor.isActive("toggle")) {
        block = { type: "toggle" };
      } else if (editor.isActive("codeBlock")) {
        block = { type: "codeBlock" };
      } else if (editor.isActive("image")) {
        block = { type: "image" };
      } else if (editor.isActive("blockquote")) {
        block = { type: "blockquote" };
      }

      setActiveBlock(block);

      if (block) {
        // Position toolbar above the selection
        const { view } = editor;
        const { from } = view.state.selection;
        const coords = view.coordsAtPos(from);
        const editorRect = view.dom.getBoundingClientRect();

        setPosition({
          top: coords.top - editorRect.top - 36,
          left: coords.left - editorRect.left,
        });
      } else {
        setPosition(null);
      }
    };

    editor.on("selectionUpdate", updateToolbar);
    editor.on("focus", updateToolbar);

    return () => {
      editor.off("selectionUpdate", updateToolbar);
      editor.off("focus", updateToolbar);
    };
  }, [editor]);

  const deleteBlock = useCallback(() => {
    if (activeBlock?.type === "table") {
      editor.chain().focus().deleteTable().run();
      return;
    }

    const { state } = editor;
    const { $from } = state.selection;
    const targetTypes = ["callout", "toggle", "codeBlock", "image", "blockquote", "horizontalRule"];

    let depth = $from.depth;
    while (depth > 0) {
      const node = $from.node(depth);
      if (targetTypes.includes(node.type.name)) {
        const from = $from.before(depth);
        const to = $from.after(depth);
        editor.chain().focus().deleteRange({ from, to }).run();
        return;
      }
      depth--;
    }
  }, [editor, activeBlock]);

  const duplicateBlock = useCallback(() => {
    if (activeBlock?.type === "table") {
      // For tables, get the table node and insert after
      const { state } = editor;
      const { $from } = state.selection;
      let depth = $from.depth;
      while (depth > 0) {
        const node = $from.node(depth);
        if (node.type.name === "table") {
          const to = $from.after(depth);
          editor.chain().focus().insertContentAt(to, node.toJSON()).run();
          return;
        }
        depth--;
      }
      return;
    }

    const { state } = editor;
    const { $from } = state.selection;
    const targetTypes = ["callout", "toggle", "codeBlock", "image", "blockquote"];

    let depth = $from.depth;
    while (depth > 0) {
      const node = $from.node(depth);
      if (targetTypes.includes(node.type.name)) {
        const to = $from.after(depth);
        editor.chain().focus().insertContentAt(to, node.toJSON()).run();
        return;
      }
      depth--;
    }
  }, [editor, activeBlock]);

  // Table-specific actions
  const addColumnAfter = useCallback(() => editor.chain().focus().addColumnAfter().run(), [editor]);
  const addRowAfter = useCallback(() => editor.chain().focus().addRowAfter().run(), [editor]);
  const deleteColumn = useCallback(() => editor.chain().focus().deleteColumn().run(), [editor]);
  const deleteRow = useCallback(() => editor.chain().focus().deleteRow().run(), [editor]);

  if (!activeBlock || !position) return null;

  return (
    <div
      className="absolute z-40 flex items-center gap-0.5 rounded-lg border border-black/8 dark:border-white/10 bg-white dark:bg-black px-1 py-0.5 shadow-lg animate-fade-in-up"
      style={{ top: position.top, left: Math.max(0, position.left) }}
    >
      <div className="flex items-center gap-0.5 text-black/20 dark:text-white/20 px-0.5">
        <GripVertical className="h-3 w-3" />
      </div>

      {activeBlock.type === "table" && (
        <>
          <ToolbarButton onClick={addColumnAfter} title="Add column">
            <Columns2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={addRowAfter} title="Add row">
            <Rows2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <div className="w-px h-4 bg-black/8 dark:bg-white/10 mx-0.5" />
          <ToolbarButton onClick={deleteColumn} title="Delete column" destructive>
            <span className="text-[9px] font-bold leading-none">−Col</span>
          </ToolbarButton>
          <ToolbarButton onClick={deleteRow} title="Delete row" destructive>
            <span className="text-[9px] font-bold leading-none">−Row</span>
          </ToolbarButton>
          <div className="w-px h-4 bg-black/8 dark:bg-white/10 mx-0.5" />
        </>
      )}

      <ToolbarButton onClick={duplicateBlock} title="Duplicate">
        <Copy className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={deleteBlock} title="Delete" destructive>
        <Trash2 className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}
