"use client";

import React, { useMemo, useRef, useEffect } from "react";
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

import { Callout } from "./extensions/callout";
import { Backlink } from "./extensions/backlink";
import { Toggle } from "./extensions/toggle";
import { Comment } from "./extensions/comment";
import { SlashCommandExtension } from "./extensions/slash-command-extension";
import {
  SlashCommandMenu,
  SlashCommandMenuRef,
} from "./menus/SlashCommandMenu";
import { createLowlight, common } from "lowlight";

const lowlight = createLowlight(common);

interface EditorProps {
  className?: string;
  editable?: boolean;
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
}

export function MarkedUpEditor({
  className,
  editable = true,
  onEditorReady,
}: EditorProps) {
  const extensions = useMemo(() => {
    const exts: any[] = [
      StarterKit.configure({
        codeBlock: false,
        link: false,
        underline: false,
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
      Comment,

      // Slash commands
      SlashCommandExtension.configure({
        suggestion: {
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

    ];

    return exts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editor = useEditor(
    {
      extensions,
      editorProps: {
        attributes: {
          class: `prose prose-sm max-w-none focus:outline-none min-h-[500px] px-4 py-6 text-black dark:text-white prose-headings:text-black dark:prose-headings:text-white prose-p:text-black/80 dark:prose-p:text-white/80 prose-strong:text-black dark:prose-strong:text-white prose-code:text-black/70 dark:prose-code:text-white/70 prose-code:bg-black/5 dark:prose-code:bg-white/5 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-blockquote:border-black/15 dark:prose-blockquote:border-white/15 prose-blockquote:text-black/60 dark:prose-blockquote:text-white/60 prose-hr:border-black/8 dark:prose-hr:border-white/10 ${className ?? ""}`,
        },
      },
      immediatelyRender: false,
    },
    []
  );

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  return (
    <div className="relative w-full">
      <EditorContent editor={editor} />
    </div>
  );
}
