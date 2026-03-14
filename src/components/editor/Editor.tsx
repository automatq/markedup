"use client";

import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import ImageExt from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table, TableCell, TableHeader } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import tippy, { Instance as TippyInstance } from "tippy.js";
import {
  useLiveblocksExtension,
  FloatingComposer,
  FloatingThreads,
  AnchoredThreads,
} from "@liveblocks/react-tiptap";
import { useThreads, useSyncStatus } from "@liveblocks/react/suspense";

import { Callout } from "./extensions/callout";
import { Backlink } from "./extensions/backlink";
import { Toggle } from "./extensions/toggle";
import { SlashCommandExtension } from "./extensions/slash-command-extension";
import {
  SlashCommandMenu,
  SlashCommandMenuRef,
} from "./menus/SlashCommandMenu";
import {
  SlashCommandItem,
  filterSlashCommands,
} from "./menus/slash-command";
import { BlockToolbar } from "./menus/BlockToolbar";
import { createLowlight, common } from "lowlight";

const lowlight = createLowlight(common);

interface EditorProps {
  initialContent?: any;
  className?: string;
  editable?: boolean;
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
}

export function MarkedUpEditor({
  initialContent,
  className,
  editable = true,
  onEditorReady,
}: EditorProps) {
  // Liveblocks extension handles Yjs sync, cursors, comments, mentions
  const liveblocks = useLiveblocksExtension({
    initialContent,
    comments: true,
    mentions: true,
  });

  const { threads } = useThreads();
  const syncStatus = useSyncStatus({ smooth: true });
  const contentApplied = useRef(false);

  const editor = useEditor({
    extensions: [
      liveblocks,
      StarterKit.configure({
        codeBlock: false,
        link: false,
        underline: false,
        undoRedo: false,
      }),
      Placeholder.configure({
        placeholder: 'Type "/" for commands…',
        showOnlyWhenEditable: true,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      ImageExt.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),

      // Tables
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,

      // Task lists
      TaskList,
      TaskItem.configure({ nested: true }),

      // Text formatting
      Underline,
      Highlight.configure({ multicolor: true }),
      Color,

      // Custom extensions
      Callout,
      Backlink,
      Toggle,

      // Slash commands
      SlashCommandExtension.configure({
        suggestion: {
          char: "/",
          startOfLine: false,
          command: ({
            editor: cmdEditor,
            range,
            props: item,
          }: {
            editor: any;
            range: any;
            props: SlashCommandItem;
          }) => {
            item.command({ editor: cmdEditor, range });
          },
          items: ({ query }: { query: string }) =>
            filterSlashCommands(query),
          render: () => {
            let component: ReactRenderer<SlashCommandMenuRef> | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(SlashCommandMenu, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },
              onUpdate: (props: any) => {
                component?.updateProps(props);
                if (popup?.[0] && props.clientRect) {
                  popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                  });
                }
              },
              onKeyDown: (props: any) => {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }
                return component?.ref?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[500px] px-4 py-6 text-black dark:text-white/85 prose-headings:text-black dark:prose-headings:text-white/90 prose-p:text-black/80 dark:prose-p:text-white/75 prose-strong:text-black dark:prose-strong:text-white/90 prose-code:text-black/70 dark:prose-code:text-white/70 prose-code:bg-black/5 dark:prose-code:bg-white/5 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-blockquote:border-black/15 dark:prose-blockquote:border-white/15 prose-blockquote:text-black/60 dark:prose-blockquote:text-white/50 prose-hr:border-black/8 dark:prose-hr:border-white/10 ${className ?? ""}`,
      },
    },
    immediatelyRender: false,
  });

  // After Liveblocks syncs, if editor is empty and we have template content, apply it.
  // Liveblocks' initialContent only seeds brand-new rooms; for rooms that already have
  // Yjs state (even empty), we must inject manually after sync settles.
  useEffect(() => {
    if (!editor || !initialContent || contentApplied.current) return;

    const tryApply = () => {
      if (contentApplied.current) return;
      // Use TipTap's built-in isEmpty plus text length check
      const empty = editor.isEmpty || editor.getText().trim().length === 0;
      if (empty) {
        contentApplied.current = true;
        editor.commands.setContent(initialContent);
      }
    };

    // If already synced, start trying immediately
    if (syncStatus === "synchronized") {
      const timers = [0, 100, 300, 800].map((ms) => setTimeout(tryApply, ms));
      return () => timers.forEach(clearTimeout);
    }

    // If not yet synced, set up a safety-net timer that fires regardless
    // (handles cases where syncStatus never reaches "synchronized" quickly)
    const safetyTimer = setTimeout(tryApply, 2000);
    return () => clearTimeout(safetyTimer);
  }, [editor, initialContent, syncStatus]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  return (
    <div className="relative w-full">
      <EditorContent editor={editor} />
      {editor && <BlockToolbar editor={editor} />}
      <FloatingComposer editor={editor} />
      <FloatingThreads editor={editor} threads={threads} />
      <AnchoredThreads editor={editor} threads={threads} />
    </div>
  );
}
