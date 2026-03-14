import { Node, mergeAttributes } from "@tiptap/core";

export interface CalloutOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: () => ReturnType;
      toggleCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-callout": "",
        class:
          "border-l-2 border-black/20 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.03] p-4 rounded-r-lg my-2",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              content: [{ type: "paragraph" }],
            })
            .run(),
      toggleCallout:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },
});
