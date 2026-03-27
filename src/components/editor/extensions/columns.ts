import { Node, mergeAttributes } from "@tiptap/core";

export interface ColumnsOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      setColumns: (count?: number) => ReturnType;
    };
  }
}

export const Columns = Node.create<ColumnsOptions>({
  name: "columns",
  group: "block",
  content: "column column+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      count: { default: 2 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "columns",
        class: "flex gap-4 my-2",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setColumns:
        (count = 2) =>
        ({ chain }) => {
          const columns = Array.from({ length: count }, () => ({
            type: "column",
            content: [{ type: "paragraph" }],
          }));
          return chain()
            .insertContent({
              type: this.name,
              attrs: { count },
              content: columns,
            })
            .run();
        },
    };
  },
});

export const Column = Node.create({
  name: "column",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "column",
        class:
          "flex-1 min-w-0 border-l first:border-l-0 border-black/6 dark:border-white/6 pl-4 first:pl-0",
      }),
      0,
    ];
  },
});
