/**
 * Backlink Graph Scanner
 *
 * Scans document content for [[bracketed_links]] and returns
 * a list of link references that can be persisted to the Node table.
 */

export interface BacklinkReference {
  /** The raw text inside the brackets */
  linkText: string;
  /** Character offset in the source text */
  position: number;
}

const BACKLINK_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * Extracts all [[backlink]] references from a plain-text or Markdown string.
 */
export function scanBacklinks(content: string): BacklinkReference[] {
  const results: BacklinkReference[] = [];
  let match: RegExpExecArray | null;

  while ((match = BACKLINK_REGEX.exec(content)) !== null) {
    results.push({
      linkText: match[1].trim(),
      position: match.index,
    });
  }

  return results;
}

/**
 * Given a document's content and the full list of documents in the workspace,
 * resolves backlink text to document IDs.
 */
export function resolveBacklinks(
  content: string,
  documentMap: Map<string, string> // title -> documentId
): Array<{ linkText: string; targetDocumentId: string }> {
  const refs = scanBacklinks(content);

  return refs
    .map((ref) => {
      const targetId = documentMap.get(ref.linkText);
      if (!targetId) return null;
      return { linkText: ref.linkText, targetDocumentId: targetId };
    })
    .filter(Boolean) as Array<{ linkText: string; targetDocumentId: string }>;
}
