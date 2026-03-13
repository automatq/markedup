import { JSONContent } from "@tiptap/core";

/**
 * Converts TipTap JSON content to clean, standard-compliant Markdown.
 * Prioritizes fidelity — the output should round-trip cleanly.
 */
export function toMarkdown(doc: JSONContent): string {
  if (!doc.content) return "";
  return doc.content.map((node) => nodeToMarkdown(node)).join("\n\n");
}

function nodeToMarkdown(node: JSONContent, depth = 0): string {
  switch (node.type) {
    case "heading": {
      const level = node.attrs?.level ?? 1;
      const prefix = "#".repeat(level);
      return `${prefix} ${inlineToMarkdown(node.content)}`;
    }

    case "paragraph":
      return inlineToMarkdown(node.content);

    case "bulletList":
      return (
        node.content
          ?.map((li) => listItemToMarkdown(li, "- ", depth))
          .join("\n") ?? ""
      );

    case "orderedList":
      return (
        node.content
          ?.map((li, i) => listItemToMarkdown(li, `${i + 1}. `, depth))
          .join("\n") ?? ""
      );

    case "listItem": {
      return (
        node.content?.map((child) => nodeToMarkdown(child, depth)).join("\n") ??
        ""
      );
    }

    case "blockquote": {
      const inner =
        node.content?.map((child) => nodeToMarkdown(child)).join("\n\n") ?? "";
      return inner
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }

    case "codeBlock": {
      const lang = node.attrs?.language ?? "";
      const code = node.content?.map((c) => c.text ?? "").join("") ?? "";
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    case "callout": {
      const inner =
        node.content?.map((child) => nodeToMarkdown(child)).join("\n\n") ?? "";
      return `> [!NOTE]\n${inner
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n")}`;
    }

    case "image":
      return `![${node.attrs?.alt ?? ""}](${node.attrs?.src ?? ""})`;

    case "horizontalRule":
      return "---";

    case "backlink":
      return `[[${node.attrs?.title ?? ""}]]`;

    default:
      return inlineToMarkdown(node.content);
  }
}

function listItemToMarkdown(
  node: JSONContent,
  prefix: string,
  depth: number
): string {
  const indent = "  ".repeat(depth);
  const content =
    node.content?.map((child) => nodeToMarkdown(child, depth + 1)).join("\n") ??
    "";
  return `${indent}${prefix}${content}`;
}

function inlineToMarkdown(content?: JSONContent[]): string {
  if (!content) return "";

  return content
    .map((node) => {
      if (node.type === "backlink") {
        return `[[${node.attrs?.title ?? ""}]]`;
      }

      let text = node.text ?? "";

      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case "bold":
              text = `**${text}**`;
              break;
            case "italic":
              text = `*${text}*`;
              break;
            case "code":
              text = `\`${text}\``;
              break;
            case "strike":
              text = `~~${text}~~`;
              break;
            case "link":
              text = `[${text}](${mark.attrs?.href ?? ""})`;
              break;
          }
        }
      }

      return text;
    })
    .join("");
}
