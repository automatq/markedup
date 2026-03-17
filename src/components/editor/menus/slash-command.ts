import { Editor, Range } from "@tiptap/core";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: Editor; range: Range }) => void;
}

export const slashCommandItems: SlashCommandItem[] = [
  // Text blocks
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "Heading1",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "Heading2",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: "Heading3",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },

  // Lists
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: "List",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: "ListOrdered",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    title: "To-do List",
    description: "Track tasks with checkboxes",
    icon: "CheckSquare",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleTaskList().run();
    },
  },

  // Rich blocks
  {
    title: "Table",
    description: "Insert a table with rows and columns",
    icon: "Table",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: "Toggle",
    description: "Collapsible section",
    icon: "ChevronRight",
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
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.commands.insertContent("<blockquote><p></p></blockquote>");
    },
  },
  {
    title: "Code Block",
    description: "Add a code snippet with syntax highlighting",
    icon: "Code",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleCodeBlock().run();
    },
  },

  // Media
  {
    title: "Image",
    description: "Insert an image from URL",
    icon: "ImageIcon",
    command: ({ editor, range }) => {
      const url = window.prompt("Image URL:");
      if (url) {
        editor.chain().focus().deleteRange(range).run();
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },

  // Formatting
  {
    title: "Divider",
    description: "Insert a horizontal rule",
    icon: "Minus",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    title: "Highlight",
    description: "Highlight selected text in yellow",
    icon: "Highlighter",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHighlight({ color: "#fef08a" }).run();
    },
  },

  // AI
  {
    title: "AI Ghost Writer",
    description: "AI continues writing from cursor position",
    icon: "Highlighter",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // Trigger ghost writer via custom event
      window.dispatchEvent(new CustomEvent("markedup:ghost-write"));
    },
  },
  {
    title: "Extract Actions",
    description: "AI finds action items in this document",
    icon: "CheckSquare",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent("markedup:extract-actions"));
    },
  },

  // Embeds
  {
    title: "Embed",
    description: "Embed YouTube, Figma, Loom, and more",
    icon: "Code",
    command: ({ editor, range }) => {
      const url = window.prompt("Paste embed URL (YouTube, Figma, Loom, etc.):");
      if (!url) return;
      editor.chain().focus().deleteRange(range).run();
      // Dynamic import to avoid circular dependency
      import("../extensions/embed").then(({ detectProvider }) => {
        const provider = detectProvider(url);
        if (provider) {
          editor.chain().focus().insertContent({
            type: "embed",
            attrs: { src: provider.embedUrl, originalUrl: url, provider: provider.name },
          }).run();
        } else {
          // Fallback to bookmark
          editor.chain().focus().insertContent({
            type: "bookmark",
            attrs: { url, title: "", description: "", image: "", favicon: "" },
          }).run();
        }
      });
    },
  },
  {
    title: "Web Bookmark",
    description: "Create a rich preview of a web link",
    icon: "ImageIcon",
    command: ({ editor, range }) => {
      const url = window.prompt("Paste URL for bookmark preview:");
      if (!url) return;
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent({
        type: "bookmark",
        attrs: { url, title: "", description: "", image: "", favicon: "" },
      }).run();
    },
  },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  return slashCommandItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );
}
