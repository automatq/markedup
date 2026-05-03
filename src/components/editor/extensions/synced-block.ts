import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { SyncedBlockView } from "./SyncedBlockView";

export interface SyncedBlockOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    syncedBlock: {
      /// Insert a synced block reference. If blockId is omitted, creates a new SyncedBlock first.
      setSyncedBlock: (attrs?: { blockId?: string }) => ReturnType;
    };
  }
}

export const SyncedBlock = Node.create<SyncedBlockOptions>({
  name: "syncedBlock",
  group: "block",
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      blockId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="synced-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "synced-block",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SyncedBlockView);
  },

  addCommands() {
    return {
      setSyncedBlock:
        (attrs) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { blockId: attrs?.blockId ?? null },
            })
            .run(),
    };
  },
});
