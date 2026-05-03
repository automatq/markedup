import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { DatabaseBlockView } from "./DatabaseBlockView";

export interface DatabaseBlockOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    databaseBlock: {
      /// Insert an inline database block. If databaseId is omitted, creates a new Database first.
      setDatabaseBlock: (attrs?: { databaseId?: string }) => ReturnType;
    };
  }
}

export const DatabaseBlock = Node.create<DatabaseBlockOptions>({
  name: "databaseBlock",
  group: "block",
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      databaseId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="database-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "database-block",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DatabaseBlockView);
  },

  addCommands() {
    return {
      setDatabaseBlock:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { databaseId: attrs?.databaseId ?? null },
            })
            .run(),
    };
  },
});
