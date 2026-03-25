import { Editor, Range } from "@tiptap/core";
import { openInputDialog } from "@/components/dialogs/InputDialog";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  category: "text" | "lists" | "blocks" | "media" | "advanced";
  command: (props: { editor: Editor; range: Range }) => void;
}

export const slashCommandItems: SlashCommandItem[] = [
  // Text
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "Heading1",
    category: "text",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "Heading2",
    category: "text",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: "Heading3",
    category: "text",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },

  // Lists
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: "List",
    category: "lists",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: "ListOrdered",
    category: "lists",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    title: "To-do List",
    description: "Track tasks with checkboxes",
    icon: "CheckSquare",
    category: "lists",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleTaskList().run();
    },
  },

  // Blocks
  {
    title: "Table",
    description: "Insert a table with rows and columns",
    icon: "Table",
    category: "blocks",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: "Toggle",
    description: "Collapsible section",
    icon: "ChevronRight",
    category: "blocks",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent({
        type: "toggle",
        attrs: { open: true },
        content: [{ type: "paragraph" }],
      }).run();
    },
  },
  {
    title: "Callout",
    description: "Highlighted information block",
    icon: "Info",
    category: "blocks",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent({
        type: "callout",
        content: [{ type: "paragraph" }],
      }).run();
    },
  },
  {
    title: "Blockquote",
    description: "Add a quote block",
    icon: "Quote",
    category: "blocks",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent("<blockquote><p></p></blockquote>");
    },
  },
  {
    title: "Code Block",
    description: "Add a code snippet with syntax highlighting",
    icon: "Code",
    category: "blocks",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    title: "Divider",
    description: "Insert a horizontal rule",
    icon: "Minus",
    category: "blocks",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().setHorizontalRule().run();
    },
  },

  // Media
  {
    title: "Image",
    description: "Insert an image from URL",
    icon: "ImageIcon",
    category: "media",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      openInputDialog({
        title: "Insert Image",
        placeholder: "Paste image URL...",
        confirmLabel: "Insert",
        onConfirm: (url) => {
          editor.chain().focus().setImage({ src: url }).run();
        },
      });
    },
  },
  {
    title: "Embed",
    description: "Embed YouTube, Figma, Loom, and more",
    icon: "Code",
    category: "media",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      openInputDialog({
        title: "Insert Embed",
        placeholder: "Paste URL (YouTube, Figma, Loom, etc.)...",
        confirmLabel: "Embed",
        onConfirm: (url) => {
          import("../extensions/embed").then(({ detectProvider }) => {
            const provider = detectProvider(url);
            if (provider) {
              editor.chain().focus().insertContent({
                type: "embed",
                attrs: { src: provider.embedUrl, originalUrl: url, provider: provider.name },
              }).run();
            } else {
              editor.chain().focus().insertContent({
                type: "bookmark",
                attrs: { url, title: "", description: "", image: "", favicon: "" },
              }).run();
            }
          });
        },
      });
    },
  },
  {
    title: "Web Bookmark",
    description: "Create a rich preview of a web link",
    icon: "ImageIcon",
    category: "media",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      openInputDialog({
        title: "Insert Bookmark",
        placeholder: "Paste URL for bookmark preview...",
        confirmLabel: "Insert",
        onConfirm: (url) => {
          editor.chain().focus().insertContent({
            type: "bookmark",
            attrs: { url, title: "", description: "", image: "", favicon: "" },
          }).run();
        },
      });
    },
  },

  // Advanced
  {
    title: "Table of Contents",
    description: "Auto-generated list of headings",
    icon: "List",
    category: "advanced",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent({ type: "tableOfContents" }).run();
    },
  },
  {
    title: "AI Ghost Writer",
    description: "AI continues writing from cursor position",
    icon: "Sparkles",
    category: "advanced",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent("markedup:ghost-write"));
    },
  },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  return slashCommandItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );
}
