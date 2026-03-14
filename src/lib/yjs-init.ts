/**
 * Server-side utility to convert TipTap JSON content into a Yjs binary update.
 *
 * This is used to pre-seed a Liveblocks room's Yjs document with template
 * content BEFORE any client connects, eliminating all client-side timing issues.
 *
 * The Yjs XML structure mirrors what y-prosemirror produces:
 *   - Element nodes  → Y.XmlElement(typeName) with attrs + children
 *   - Text nodes     → Y.XmlText with delta (insert + mark attributes)
 *   - Marks          → delta attributes keyed by mark name
 *   - Fragment name  → "default" (used by @liveblocks/react-tiptap)
 */

import * as Y from "yjs";

interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

/**
 * Convert TipTap JSON content to a Yjs binary update that can be sent
 * to Liveblocks via `sendYjsBinaryUpdate`.
 */
export function tiptapJsonToYjsUpdate(content: TipTapNode): Uint8Array {
  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment("default");

  ydoc.transact(() => {
    const nodes = content.type === "doc" ? content.content || [] : [content];
    const yChildren = convertChildren(nodes);
    if (yChildren.length > 0) {
      fragment.insert(0, yChildren);
    }
  });

  return Y.encodeStateAsUpdate(ydoc);
}

/**
 * Convert an array of TipTap child nodes, grouping consecutive text nodes
 * into a single Y.XmlText (matching y-prosemirror behavior).
 */
function convertChildren(
  nodes: TipTapNode[]
): (Y.XmlElement | Y.XmlText)[] {
  const result: (Y.XmlElement | Y.XmlText)[] = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];

    if (node.type === "text") {
      // Group consecutive text nodes into one XmlText with a delta
      const textGroup: TipTapNode[] = [];
      while (i < nodes.length && nodes[i].type === "text") {
        textGroup.push(nodes[i]);
        i++;
      }
      result.push(createXmlText(textGroup));
    } else {
      result.push(createXmlElement(node));
      i++;
    }
  }

  return result;
}

/**
 * Create a Y.XmlText from a group of consecutive TipTap text nodes.
 * Each text node becomes a delta segment with its own mark attributes.
 */
function createXmlText(textNodes: TipTapNode[]): Y.XmlText {
  const xmlText = new Y.XmlText();

  const delta = textNodes.map((node) => {
    const segment: { insert: string; attributes?: Record<string, any> } = {
      insert: node.text || "",
    };

    if (node.marks && node.marks.length > 0) {
      const attributes: Record<string, any> = {};
      for (const mark of node.marks) {
        attributes[mark.type] = mark.attrs || {};
      }
      segment.attributes = attributes;
    }

    return segment;
  });

  xmlText.applyDelta(delta);
  return xmlText;
}

/**
 * Create a Y.XmlElement from a TipTap element node.
 */
function createXmlElement(node: TipTapNode): Y.XmlElement {
  const el = new Y.XmlElement(node.type);

  // Set node attributes
  if (node.attrs) {
    for (const [key, value] of Object.entries(node.attrs)) {
      if (value !== null && value !== undefined) {
        el.setAttribute(key, value);
      }
    }
  }

  // Recursively convert and insert children
  if (node.content && node.content.length > 0) {
    const children = convertChildren(node.content);
    if (children.length > 0) {
      el.insert(0, children);
    }
  }

  return el;
}
