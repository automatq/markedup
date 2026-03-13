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
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "Heading2",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: "Heading3",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },

  // Lists
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: "List",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: "ListOrdered",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "To-do List",
    description: "Track tasks with checkboxes",
    icon: "CheckSquare",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },

  // Rich blocks
  {
    title: "Table",
    description: "Insert a table with rows and columns",
    icon: "Table",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: "Toggle",
    description: "Collapsible section",
    icon: "ChevronRight",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setToggle().run();
    },
  },
  {
    title: "Callout",
    description: "Highlighted information block",
    icon: "Info",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCallout().run();
    },
  },
  {
    title: "Blockquote",
    description: "Add a quote block",
    icon: "Quote",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Add a code snippet with syntax highlighting",
    icon: "Code",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
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
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },

  // Formatting
  {
    title: "Divider",
    description: "Insert a horizontal rule",
    icon: "Minus",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
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
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  return slashCommandItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );
}
