"use client";

import React from "react";
import { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  Link2,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Undo2,
  Redo2,
  MessageSquare,
} from "lucide-react";
import { openLinkDialog } from "@/components/dialogs/LinkDialog";

interface ToolbarProps {
  editor: Editor | null;
}

interface ToolbarButton {
  icon: React.ElementType;
  title: string;
  action: () => void;
  isActive?: boolean;
}

export function EditorToolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  const groups: ToolbarButton[][] = [
    [
      {
        icon: Bold,
        title: "Bold",
        action: () => editor.chain().focus().toggleBold().run(),
        isActive: editor.isActive("bold"),
      },
      {
        icon: Italic,
        title: "Italic",
        action: () => editor.chain().focus().toggleItalic().run(),
        isActive: editor.isActive("italic"),
      },
      {
        icon: Underline,
        title: "Underline",
        action: () => editor.chain().focus().toggleUnderline().run(),
        isActive: editor.isActive("underline"),
      },
      {
        icon: Strikethrough,
        title: "Strikethrough",
        action: () => editor.chain().focus().toggleStrike().run(),
        isActive: editor.isActive("strike"),
      },
      {
        icon: Code,
        title: "Inline code",
        action: () => editor.chain().focus().toggleCode().run(),
        isActive: editor.isActive("code"),
      },
      {
        icon: Highlighter,
        title: "Highlight",
        action: () => editor.chain().focus().toggleHighlight().run(),
        isActive: editor.isActive("highlight"),
      },
      {
        icon: Link2,
        title: "Insert link",
        action: () => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const { from, to } = editor.state.selection;
          const selectedText = from !== to ? editor.state.doc.textBetween(from, to) : "";
          openLinkDialog({
            initialText: selectedText,
            onConfirm: (url, text) => {
              if (selectedText) {
                editor.chain().focus().setLink({ href: url }).run();
              } else {
                editor.chain().focus().insertContent({
                  type: "text",
                  marks: [{ type: "link", attrs: { href: url } }],
                  text: text || url,
                }).run();
              }
            },
          });
        },
        isActive: editor.isActive("link"),
      },
    ],
    [
      {
        icon: List,
        title: "Bullet list",
        action: () => editor.chain().focus().toggleBulletList().run(),
        isActive: editor.isActive("bulletList"),
      },
      {
        icon: ListOrdered,
        title: "Numbered list",
        action: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: editor.isActive("orderedList"),
      },
      {
        icon: CheckSquare,
        title: "Task list",
        action: () => editor.chain().focus().toggleTaskList().run(),
        isActive: editor.isActive("taskList"),
      },
      {
        icon: Quote,
        title: "Blockquote",
        action: () => editor.chain().focus().toggleBlockquote().run(),
        isActive: editor.isActive("blockquote"),
      },
    ],
    [
      {
        icon: Undo2,
        title: "Undo",
        action: () => editor.commands.undo(),
      },
      {
        icon: Redo2,
        title: "Redo",
        action: () => editor.commands.redo(),
      },
    ],
    [
      {
        icon: MessageSquare,
        title: "Add comment",
        action: () => {
          const id = `comment-${Date.now()}`;
          editor.chain().focus().setComment({ id }).run();
        },
      },
    ],
  ];

  return (
    <div className="flex items-center gap-0.5 border-b border-black/8 dark:border-white/10 px-4 py-1.5 overflow-x-auto">
      {groups.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && (
            <div className="mx-1.5 h-4 w-px bg-black/8 dark:bg-white/10 shrink-0" />
          )}
          {group.map((btn) => (
            <button
              key={btn.title}
              onClick={btn.action}
              title={btn.title}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                btn.isActive
                  ? "bg-black/10 dark:bg-white/10 text-black dark:text-white"
                  : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <btn.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}
