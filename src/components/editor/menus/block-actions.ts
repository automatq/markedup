import { Editor } from "@tiptap/core";
import { Node as PmNode } from "@tiptap/pm/model";
import {
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Code, Type, ChevronRight, Info, type LucideIcon,
} from "lucide-react";

export const COLORS = [
  { name: "Default", value: "" }, { name: "Gray", value: "#9ca3af" },
  { name: "Brown", value: "#a87652" }, { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" }, { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" }, { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" }, { name: "Pink", value: "#ec4899" },
];

export const TURN_INTO: { type: string; label: string; icon: LucideIcon }[] = [
  { type: "paragraph", label: "Text", icon: Type },
  { type: "h1", label: "Heading 1", icon: Heading1 },
  { type: "h2", label: "Heading 2", icon: Heading2 },
  { type: "h3", label: "Heading 3", icon: Heading3 },
  { type: "bulletList", label: "Bullet List", icon: List },
  { type: "orderedList", label: "Numbered List", icon: ListOrdered },
  { type: "taskList", label: "To-do List", icon: CheckSquare },
  { type: "blockquote", label: "Quote", icon: Quote },
  { type: "codeBlock", label: "Code", icon: Code },
  { type: "toggle", label: "Toggle", icon: ChevronRight },
  { type: "callout", label: "Callout", icon: Info },
];

/** Walk top-level doc nodes and match by PmNode reference. */
export function findBlockPos(editor: Editor, node: PmNode | null): number | null {
  if (!node) return null;
  let pos = 0;
  for (let i = 0; i < editor.state.doc.childCount; i++) {
    const child = editor.state.doc.child(i);
    if (child === node) return pos;
    pos += child.nodeSize;
  }
  return null;
}

export function turnBlockInto(editor: Editor, pos: number, type: string) {
  editor.chain().focus().setTextSelection(pos + 1).run();
  switch (type) {
    case "paragraph": editor.chain().focus().setParagraph().run(); break;
    case "h1": editor.chain().focus().setHeading({ level: 1 }).run(); break;
    case "h2": editor.chain().focus().setHeading({ level: 2 }).run(); break;
    case "h3": editor.chain().focus().setHeading({ level: 3 }).run(); break;
    case "bulletList": editor.chain().focus().toggleBulletList().run(); break;
    case "orderedList": editor.chain().focus().toggleOrderedList().run(); break;
    case "taskList": editor.chain().focus().toggleTaskList().run(); break;
    case "blockquote": editor.chain().focus().toggleBlockquote().run(); break;
    case "codeBlock": editor.chain().focus().toggleCodeBlock().run(); break;
    case "toggle":
      editor.chain().focus().insertContent({
        type: "toggle",
        attrs: { open: true },
        content: [{ type: "paragraph" }],
      }).run();
      break;
    case "callout":
      editor.chain().focus().insertContent({
        type: "callout",
        content: [{ type: "paragraph" }],
      }).run();
      break;
  }
}

export function setBlockColor(editor: Editor, pos: number, nodeSize: number, color: string) {
  editor.chain().focus()
    .setTextSelection({ from: pos + 1, to: pos + nodeSize - 1 })
    .setColor(color)
    .run();
}

export function deleteBlock(editor: Editor, pos: number, nodeSize: number) {
  editor.chain().focus().deleteRange({ from: pos, to: pos + nodeSize }).run();
}

export function duplicateBlock(editor: Editor, pos: number, node: PmNode) {
  editor.chain().focus().insertContentAt(pos + node.nodeSize, node.toJSON()).run();
}
