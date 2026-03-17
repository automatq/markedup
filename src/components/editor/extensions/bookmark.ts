import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { BookmarkView } from "./BookmarkView";

export const Bookmark = Node.create({
  name: "bookmark",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      url: { default: "" },
      title: { default: "" },
      description: { default: "" },
      image: { default: "" },
      favicon: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="bookmark"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "bookmark" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkView);
  },
});
