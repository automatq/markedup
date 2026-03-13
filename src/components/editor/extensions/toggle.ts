import { Node, mergeAttributes } from "@tiptap/core";

export interface ToggleOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType;
    };
  }
}

export const Toggle = Node.create<ToggleOptions>({
  name: "toggle",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      open: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "details",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        open: node.attrs.open ? "true" : undefined,
        class:
          "group rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] my-2 [&>summary]:cursor-pointer [&>summary]:px-4 [&>summary]:py-2.5 [&>summary]:text-sm [&>summary]:font-medium [&>summary]:text-black dark:[&>summary]:text-white [&>summary]:select-none [&>summary]:list-none [&>summary::-webkit-details-marker]:hidden",
      }),
      [
        "summary",
        {},
        "Toggle heading",
      ],
      ["div", { class: "px-4 pb-3 pt-0" }, 0],
    ];
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
    };
  },
});
