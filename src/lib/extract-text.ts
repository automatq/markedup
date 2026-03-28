/**
 * Extract plain text from TipTap JSONContent for full-text search indexing.
 * Recursively walks the document tree, collecting all text content.
 */
export function extractText(doc: any): string {
  if (!doc) return "";
  const parts: string[] = [];

  function walk(node: any) {
    if (!node) return;

    // Text nodes
    if (node.text) {
      parts.push(node.text);
      return;
    }

    // Special attrs that contain searchable text
    if (node.attrs?.content && typeof node.attrs.content === "string") {
      parts.push(node.attrs.content);
    }
    if (node.attrs?.title && typeof node.attrs.title === "string") {
      parts.push(node.attrs.title);
    }

    // Recurse into children
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  walk(doc);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
