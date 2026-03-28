"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import DragHandle from "@tiptap/extension-drag-handle-react";
import { Node as PmNode } from "@tiptap/pm/model";
import {
  useLiveblocksExtension,
  FloatingComposer,
  FloatingThreads,
  AnchoredThreads,
} from "@liveblocks/react-tiptap";
import { useThreads } from "@liveblocks/react/suspense";

import { Callout } from "./extensions/callout";
import { Backlink } from "./extensions/backlink";
import { Toggle } from "./extensions/toggle";
import { KeyboardShortcuts } from "./extensions/keyboard-shortcuts";
import { Embed } from "./extensions/embed";
import { Bookmark } from "./extensions/bookmark";
import { SearchReplace } from "./extensions/search-replace";
import { TableOfContents } from "./extensions/table-of-contents";
import { MathBlock } from "./extensions/math-block";
import { MermaidBlock } from "./extensions/mermaid-block";
import { Columns, Column } from "./extensions/columns";
import { AudioBlock } from "./extensions/audio-block";
import { VideoBlock } from "./extensions/video-block";
import { PdfBlock } from "./extensions/pdf-block";
import { Footnote } from "./extensions/footnote";
import { PageBreak } from "./extensions/page-break";
import Mathematics from "@tiptap/extension-mathematics";
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
import { BlockHandleContent } from "./menus/BlockHandle";
import { AIBubbleMenu } from "./menus/AIBubbleMenu";
import { EditorContextMenu } from "./menus/EditorContextMenu";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { LinkDialog } from "@/components/dialogs/LinkDialog";
import { createLowlight, common } from "lowlight";

const lowlight = createLowlight(common);

interface EditorProps {
  initialContent?: any;
  className?: string;
  editable?: boolean;
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
}

export function MarkedUpEditor({
  className,
  editable = true,
  onEditorReady,
}: EditorProps) {
  const liveblocks = useLiveblocksExtension({
    comments: true,
    mentions: true,
  });

  const { threads } = useThreads();

  // Track the currently hovered node from DragHandle
  // Use refs to avoid re-renders on every Yjs sync — only update state when node actually changes
  const [currentNode, setCurrentNode] = useState<PmNode | null>(null);
  const [currentNodePos, setCurrentNodePos] = useState(-1);
  const lastNodeRef = useRef<PmNode | null>(null);
  const lastPosRef = useRef(-1);

  const handleNodeChange = useCallback(({ node, pos }: { node: PmNode | null; pos: number }) => {
    // Skip if same node at same position — prevents re-render storms during collab sync
    if (node === lastNodeRef.current && pos === lastPosRef.current) return;
    // Don't update state when node becomes null (handle hidden during typing)
    // This prevents re-renders that disrupt the slash command suggestion popup
    if (!node) {
      lastNodeRef.current = null;
      lastPosRef.current = -1;
      return;
    }
    lastNodeRef.current = node;
    lastPosRef.current = pos;
    setCurrentNode(node);
    setCurrentNodePos(pos);
  }, []);

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
      KeyboardShortcuts,
      Embed,
      Bookmark,
      SearchReplace,
      TableOfContents,
      MathBlock,
      MermaidBlock,
      Columns,
      Column,
      AudioBlock,
      VideoBlock,
      PdfBlock,
      Footnote,
      PageBreak,
      Mathematics,

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

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  return (
    <div className="relative w-full">
      <EditorContent editor={editor} />

      {/* Official Tiptap DragHandle — handles hover, positioning, drag-and-drop natively */}
      {editor && (
        <DragHandle
          editor={editor}
          onNodeChange={handleNodeChange}
          nested={{ edgeDetection: { threshold: -16 } }}
        >
          <div className="flex items-center gap-1">
            <BlockHandleContent
              editor={editor}
              currentNode={currentNode}
              currentNodePos={currentNodePos}
            />
          </div>
        </DragHandle>
      )}

      {editor && <AIBubbleMenu editor={editor} />}
      {editor && <EditorContextMenu editor={editor} />}
      {editor && <BlockToolbar editor={editor} />}
      <InputDialog />
      <LinkDialog />
      <FloatingComposer editor={editor} />
      <FloatingThreads editor={editor} threads={threads} />
      <AnchoredThreads editor={editor} threads={threads} />
    </div>
  );
}
