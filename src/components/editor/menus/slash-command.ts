import { Editor, Range } from "@tiptap/core";
import { Node as PmNode } from "@tiptap/pm/model";
import { openInputDialog } from "@/components/dialogs/InputDialog";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  category: "text" | "lists" | "blocks" | "media" | "advanced" | "inline" | "color";
  aliases?: string[];
  shortcut?: string;
  command: (props: { editor: Editor; range: Range }) => void;
}

export const slashCommandItems: SlashCommandItem[] = [
  // ── Text ──

  {
    title: "Text",
    description: "Convert to plain text paragraph",
    icon: "Type",
    category: "text",
    aliases: ["paragraph", "plain"],
    shortcut: "⌘+⌥+0",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "Heading1",
    category: "text",
    aliases: ["h1", "title"],
    shortcut: "⌘+⌥+1",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "Heading2",
    category: "text",
    aliases: ["h2", "subtitle"],
    shortcut: "⌘+⌥+2",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: "Heading3",
    category: "text",
    aliases: ["h3"],
    shortcut: "⌘+⌥+3",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },

  // ── Lists ──

  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: "List",
    category: "lists",
    aliases: ["bullets", "unordered", "ul"],
    shortcut: "⌘+⌥+5",
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
    aliases: ["ordered", "ol", "numbers"],
    shortcut: "⌘+⌥+6",
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
    aliases: ["todo", "task", "checkbox", "checklist"],
    shortcut: "⌘+⌥+4",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().toggleTaskList().run();
    },
  },

  // ── Blocks ──

  {
    title: "Table",
    description: "Insert a table with rows and columns",
    icon: "Table",
    category: "blocks",
    aliases: ["grid", "spreadsheet"],
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
    aliases: ["collapse", "details", "accordion", "dropdown"],
    shortcut: "⌘+⌥+7",
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
    description: "Highlighted block with emoji icon",
    icon: "Info",
    category: "blocks",
    aliases: ["info", "note", "warning", "tip", "alert"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent({
        type: "callout",
        attrs: { emoji: "💡" },
        content: [{ type: "paragraph" }],
      }).run();
    },
  },
  {
    title: "Blockquote",
    description: "Add a quote block",
    icon: "Quote",
    category: "blocks",
    aliases: ["quote", "citation"],
    shortcut: "⌘+⌥+9",
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
    aliases: ["code", "snippet", "pre", "programming"],
    shortcut: "⌘+⌥+8",
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
    aliases: ["hr", "separator", "line", "horizontal rule"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    title: "Equation",
    description: "Display a math equation (LaTeX)",
    icon: "Sigma",
    category: "blocks",
    aliases: ["math", "latex", "formula", "katex"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: "mathBlock",
        attrs: { content: "E = mc^2" },
      }).run();
    },
  },
  {
    title: "Mermaid Diagram",
    description: "Create a diagram with Mermaid syntax",
    icon: "GitBranch",
    category: "blocks",
    aliases: ["diagram", "flowchart", "sequence", "chart", "graph"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: "mermaidBlock",
        attrs: { content: "graph TD\n  A[Start] --> B[End]" },
      }).run();
    },
  },
  {
    title: "2 Columns",
    description: "Split content into two columns",
    icon: "Columns2",
    category: "blocks",
    aliases: ["columns", "cols", "side by side", "2col"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: "columns",
        attrs: { count: 2 },
        content: [
          { type: "column", content: [{ type: "paragraph" }] },
          { type: "column", content: [{ type: "paragraph" }] },
        ],
      }).run();
    },
  },
  {
    title: "3 Columns",
    description: "Split content into three columns",
    icon: "Columns3",
    category: "blocks",
    aliases: ["3col", "three columns", "triple"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: "columns",
        attrs: { count: 3 },
        content: [
          { type: "column", content: [{ type: "paragraph" }] },
          { type: "column", content: [{ type: "paragraph" }] },
          { type: "column", content: [{ type: "paragraph" }] },
        ],
      }).run();
    },
  },

  // ── Media ──

  {
    title: "Image",
    description: "Insert image from URL or upload",
    icon: "ImageIcon",
    category: "media",
    aliases: ["photo", "picture", "img", "upload"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // Create a hidden file input for upload, with URL fallback
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            editor.chain().focus().setImage({ src: reader.result as string }).run();
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    },
  },
  {
    title: "Image from URL",
    description: "Insert an image from a URL",
    icon: "ImageIcon",
    category: "media",
    aliases: ["image url", "paste image"],
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
    aliases: ["youtube", "video", "figma", "loom", "iframe"],
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
    aliases: ["link", "preview", "bookmark", "url"],
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
  {
    title: "Audio",
    description: "Embed an audio file",
    icon: "Music",
    category: "media",
    aliases: ["sound", "mp3", "music", "podcast"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "audio/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            editor.chain().focus().insertContent({
              type: "audioBlock",
              attrs: { src: reader.result as string },
            }).run();
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    },
  },
  {
    title: "Video",
    description: "Embed a video file",
    icon: "Film",
    category: "media",
    aliases: ["movie", "mp4", "clip"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            editor.chain().focus().insertContent({
              type: "videoBlock",
              attrs: { src: reader.result as string },
            }).run();
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    },
  },
  {
    title: "PDF",
    description: "Embed a PDF document",
    icon: "FileText",
    category: "media",
    aliases: ["document", "pdf", "file"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      openInputDialog({
        title: "Insert PDF",
        placeholder: "Paste PDF URL...",
        confirmLabel: "Embed",
        onConfirm: (url) => {
          editor.chain().focus().insertContent({
            type: "pdfBlock",
            attrs: { src: url },
          }).run();
        },
      });
    },
  },

  // ── Advanced ──

  {
    title: "Table of Contents",
    description: "Auto-generated list of headings",
    icon: "List",
    category: "advanced",
    aliases: ["toc", "outline", "contents"],
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
    aliases: ["ai", "generate", "write", "autocomplete"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent("markedup:ghost-write"));
    },
  },
  {
    title: "Date",
    description: "Insert today's date",
    icon: "Calendar",
    category: "advanced",
    aliases: ["today", "timestamp", "now"],
    command: ({ editor, range }) => {
      const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      editor.chain().focus().deleteRange(range).insertContent(date).run();
    },
  },
  {
    title: "Emoji",
    description: "Insert an emoji",
    icon: "Smile",
    category: "advanced",
    aliases: ["smiley", "emoticon", "icon"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // Trigger native emoji picker if available (macOS: Cmd+Ctrl+Space)
      const event = new KeyboardEvent("keydown", {
        key: " ",
        code: "Space",
        metaKey: true,
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    },
  },
  {
    title: "Mention",
    description: "Mention a person or page",
    icon: "AtSign",
    category: "advanced",
    aliases: ["at", "user", "person", "tag"],
    command: ({ editor, range }) => {
      // Delete the slash command range and insert @ to trigger mention
      editor.chain().focus().deleteRange(range).insertContent("@").run();
    },
  },
  {
    title: "Inline Math",
    description: "Insert inline equation",
    icon: "Sigma",
    category: "advanced",
    aliases: ["inline equation", "math inline", "$", "formula inline"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent("$E=mc^2$").run();
    },
  },
  {
    title: "Sub-page",
    description: "Create a nested child page",
    icon: "FileText",
    category: "advanced",
    aliases: ["page", "child page", "nested page", "new page"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // Dispatch event for the parent app to handle sub-page creation
      window.dispatchEvent(new CustomEvent("markedup:create-subpage"));
    },
  },
  {
    title: "Template",
    description: "Insert a pre-built template",
    icon: "LayoutTemplate",
    category: "advanced",
    aliases: ["template", "snippet", "preset"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      window.dispatchEvent(new CustomEvent("markedup:insert-template"));
    },
  },

  {
    title: "Footnote",
    description: "Add a numbered footnote reference",
    icon: "Superscript",
    category: "advanced",
    aliases: ["footnote", "reference", "citation", "note", "endnote"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: "footnote",
        attrs: { content: "" },
      }).run();
    },
  },
  {
    title: "Page Break",
    description: "Insert a page break for printing/PDF",
    icon: "FileBreak",
    category: "advanced",
    aliases: ["break", "newpage", "page", "print break"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: "pageBreak",
      }).run();
    },
  },

  // ── Inline ──

  {
    title: "Bold",
    description: "Make text bold",
    icon: "Bold",
    category: "inline",
    aliases: ["strong", "heavy"],
    shortcut: "⌘+B",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBold().run();
    },
  },
  {
    title: "Italic",
    description: "Make text italic",
    icon: "Italic",
    category: "inline",
    aliases: ["emphasis", "em"],
    shortcut: "⌘+I",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleItalic().run();
    },
  },
  {
    title: "Underline",
    description: "Underline text",
    icon: "Underline",
    category: "inline",
    aliases: ["underlined"],
    shortcut: "⌘+U",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleUnderline().run();
    },
  },
  {
    title: "Strikethrough",
    description: "Cross out text",
    icon: "Strikethrough",
    category: "inline",
    aliases: ["strike", "crossout", "linethrough"],
    shortcut: "⌘+⇧+S",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleStrike().run();
    },
  },
  {
    title: "Inline Code",
    description: "Mark as inline code",
    icon: "Code2",
    category: "inline",
    aliases: ["monospace", "mono"],
    shortcut: "⌘+E",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCode().run();
    },
  },
  {
    title: "Highlight",
    description: "Highlight text with color",
    icon: "Highlighter",
    category: "inline",
    aliases: ["marker", "background"],
    shortcut: "⌘+⇧+H",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHighlight().run();
    },
  },

  // ── Colors ──

  {
    title: "Red",
    description: "Set text color to red",
    icon: "Palette",
    category: "color",
    aliases: ["red text", "red color"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setColor("#ef4444").run();
    },
  },
  {
    title: "Orange",
    description: "Set text color to orange",
    icon: "Palette",
    category: "color",
    aliases: ["orange text"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setColor("#f97316").run();
    },
  },
  {
    title: "Yellow",
    description: "Set text color to yellow",
    icon: "Palette",
    category: "color",
    aliases: ["yellow text"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setColor("#eab308").run();
    },
  },
  {
    title: "Green",
    description: "Set text color to green",
    icon: "Palette",
    category: "color",
    aliases: ["green text"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setColor("#22c55e").run();
    },
  },
  {
    title: "Blue",
    description: "Set text color to blue",
    icon: "Palette",
    category: "color",
    aliases: ["blue text"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setColor("#3b82f6").run();
    },
  },
  {
    title: "Purple",
    description: "Set text color to purple",
    icon: "Palette",
    category: "color",
    aliases: ["purple text", "violet"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setColor("#a855f7").run();
    },
  },
  {
    title: "Pink",
    description: "Set text color to pink",
    icon: "Palette",
    category: "color",
    aliases: ["pink text"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setColor("#ec4899").run();
    },
  },
  {
    title: "Gray",
    description: "Set text color to gray",
    icon: "Palette",
    category: "color",
    aliases: ["gray text", "grey"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setColor("#9ca3af").run();
    },
  },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  const q = query.toLowerCase();
  if (!q) return slashCommandItems;
  return slashCommandItems.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.aliases?.some((a) => a.toLowerCase().includes(q))
  );
}

/**
 * Execute a slash command on an existing block (used by BlockHandle picker).
 * Unlike the slash menu which deletes a range, this operates on a block at a known position.
 */
export function executeCommandOnBlock(
  editor: Editor,
  item: SlashCommandItem,
  blockPos: number,
  blockNode: PmNode
) {
  const isEmpty = blockNode.textContent.trim() === "";
  const endPos = blockPos + blockNode.nodeSize;

  // Commands that convert the current block in-place
  const inPlaceTypes = [
    "Text", "Heading 1", "Heading 2", "Heading 3",
    "Bullet List", "Numbered List", "To-do List",
    "Blockquote", "Code Block",
    "Bold", "Italic", "Underline", "Strikethrough", "Inline Code", "Highlight",
    "Red", "Orange", "Yellow", "Green", "Blue", "Purple", "Pink", "Gray",
  ];

  if (inPlaceTypes.includes(item.title)) {
    // Set cursor inside the block, then use the slash command's own logic
    editor.chain().focus().setTextSelection(blockPos + 1).run();

    // Create a fake range that selects just the cursor position
    const fakeRange = { from: blockPos + 1, to: blockPos + 1 };
    // For in-place conversions, we don't want to delete anything
    // Re-implement the core logic directly
    switch (item.title) {
      case "Text": editor.chain().focus().setParagraph().run(); break;
      case "Heading 1": editor.chain().focus().setHeading({ level: 1 }).run(); break;
      case "Heading 2": editor.chain().focus().setHeading({ level: 2 }).run(); break;
      case "Heading 3": editor.chain().focus().setHeading({ level: 3 }).run(); break;
      case "Bullet List": editor.chain().focus().toggleBulletList().run(); break;
      case "Numbered List": editor.chain().focus().toggleOrderedList().run(); break;
      case "To-do List": editor.chain().focus().toggleTaskList().run(); break;
      case "Blockquote": editor.chain().focus().toggleBlockquote().run(); break;
      case "Code Block": editor.chain().focus().toggleCodeBlock().run(); break;
      case "Bold": editor.chain().focus().toggleBold().run(); break;
      case "Italic": editor.chain().focus().toggleItalic().run(); break;
      case "Underline": editor.chain().focus().toggleUnderline().run(); break;
      case "Strikethrough": editor.chain().focus().toggleStrike().run(); break;
      case "Inline Code": editor.chain().focus().toggleCode().run(); break;
      case "Highlight": editor.chain().focus().toggleHighlight().run(); break;
      case "Red": editor.chain().focus().setColor("#ef4444").run(); break;
      case "Orange": editor.chain().focus().setColor("#f97316").run(); break;
      case "Yellow": editor.chain().focus().setColor("#eab308").run(); break;
      case "Green": editor.chain().focus().setColor("#22c55e").run(); break;
      case "Blue": editor.chain().focus().setColor("#3b82f6").run(); break;
      case "Purple": editor.chain().focus().setColor("#a855f7").run(); break;
      case "Pink": editor.chain().focus().setColor("#ec4899").run(); break;
      case "Gray": editor.chain().focus().setColor("#9ca3af").run(); break;
    }
    return;
  }

  // Commands that insert a new block — if current block is empty, replace it
  const insertPos = isEmpty ? blockPos : endPos;
  if (isEmpty) {
    editor.chain().focus().deleteRange({ from: blockPos, to: endPos }).run();
  }

  switch (item.title) {
    case "Table":
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      break;
    case "Toggle":
      editor.chain().focus().insertContentAt(insertPos - (isEmpty ? blockPos : 0), {
        type: "toggle", attrs: { open: true }, content: [{ type: "paragraph" }],
      }).run();
      break;
    case "Callout":
      editor.chain().focus().insertContentAt(insertPos - (isEmpty ? blockPos : 0), {
        type: "callout", content: [{ type: "paragraph" }],
      }).run();
      break;
    case "Divider":
      editor.chain().focus().insertContentAt(insertPos - (isEmpty ? blockPos : 0), {
        type: "horizontalRule",
      }).run();
      break;
    case "Equation":
      editor.chain().focus().insertContentAt(insertPos - (isEmpty ? blockPos : 0), {
        type: "mathBlock", attrs: { content: "E = mc^2" },
      }).run();
      break;
    case "Mermaid Diagram":
      editor.chain().focus().insertContentAt(insertPos - (isEmpty ? blockPos : 0), {
        type: "mermaidBlock", attrs: { content: "graph TD\n  A[Start] --> B[End]" },
      }).run();
      break;
    case "2 Columns":
      editor.chain().focus().insertContentAt(insertPos - (isEmpty ? blockPos : 0), {
        type: "columns", attrs: { count: 2 },
        content: [
          { type: "column", content: [{ type: "paragraph" }] },
          { type: "column", content: [{ type: "paragraph" }] },
        ],
      }).run();
      break;
    case "3 Columns":
      editor.chain().focus().insertContentAt(insertPos - (isEmpty ? blockPos : 0), {
        type: "columns", attrs: { count: 3 },
        content: [
          { type: "column", content: [{ type: "paragraph" }] },
          { type: "column", content: [{ type: "paragraph" }] },
          { type: "column", content: [{ type: "paragraph" }] },
        ],
      }).run();
      break;
    case "Table of Contents":
      editor.chain().focus().insertContentAt(insertPos - (isEmpty ? blockPos : 0), {
        type: "tableOfContents",
      }).run();
      break;
    case "Page Break":
      editor.chain().focus().insertContentAt(insertPos - (isEmpty ? blockPos : 0), {
        type: "pageBreak",
      }).run();
      break;
    case "Image":
    case "Image from URL": {
      const url = window.prompt("Image URL:");
      if (url) editor.chain().focus().setImage({ src: url }).run();
      break;
    }
    case "Audio":
    case "Video":
    case "PDF":
    case "Mention":
    case "Inline Math":
    case "Sub-page":
    case "Template":
    default:
      // For commands that use dialogs (Embed, Bookmark) or special behavior (AI, Emoji, Date),
      // fall back to creating a fake range and calling the command directly
      editor.chain().focus().setTextSelection(blockPos + 1).run();
      item.command({
        editor,
        range: { from: blockPos + 1, to: blockPos + 1 },
      });
      break;
  }
}
