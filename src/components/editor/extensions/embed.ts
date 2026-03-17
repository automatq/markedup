import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { EmbedView } from "./EmbedView";

/** URL pattern → provider name + embed URL transform */
const PROVIDERS: { name: string; pattern: RegExp; toEmbed: (url: string) => string }[] = [
  {
    name: "youtube",
    pattern: /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/,
    toEmbed: (url) => {
      const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
      return m ? `https://www.youtube.com/embed/${m[1]}` : url;
    },
  },
  {
    name: "vimeo",
    pattern: /vimeo\.com\/(\d+)/,
    toEmbed: (url) => {
      const m = url.match(/vimeo\.com\/(\d+)/);
      return m ? `https://player.vimeo.com/video/${m[1]}` : url;
    },
  },
  {
    name: "loom",
    pattern: /loom\.com\/share\/([\w-]+)/,
    toEmbed: (url) => {
      const m = url.match(/loom\.com\/share\/([\w-]+)/);
      return m ? `https://www.loom.com/embed/${m[1]}` : url;
    },
  },
  {
    name: "figma",
    pattern: /figma\.com\/(file|design|proto)\//,
    toEmbed: (url) => `https://www.figma.com/embed?embed_host=markedup&url=${encodeURIComponent(url)}`,
  },
  {
    name: "codepen",
    pattern: /codepen\.io\/[\w-]+\/pen\/([\w-]+)/,
    toEmbed: (url) => url.replace("/pen/", "/embed/"),
  },
  {
    name: "spotify",
    pattern: /open\.spotify\.com\/(track|album|playlist)\/([\w-]+)/,
    toEmbed: (url) => url.replace("open.spotify.com", "open.spotify.com/embed"),
  },
  {
    name: "google-maps",
    pattern: /google\.\w+\/maps/,
    toEmbed: (url) => `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d0!2d0!3d0&q=${encodeURIComponent(url)}`,
  },
  {
    name: "miro",
    pattern: /miro\.com\/app\/board\/([\w=]+)/,
    toEmbed: (url) => {
      const m = url.match(/miro\.com\/app\/board\/([\w=]+)/);
      return m ? `https://miro.com/app/live-embed/${m[1]}/` : url;
    },
  },
];

export function detectProvider(url: string): { name: string; embedUrl: string } | null {
  for (const p of PROVIDERS) {
    if (p.pattern.test(url)) {
      return { name: p.name, embedUrl: p.toEmbed(url) };
    }
  }
  return null;
}

export const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: "" },
      originalUrl: { default: "" },
      provider: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "embed" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },
});
