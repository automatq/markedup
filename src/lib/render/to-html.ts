import type { JSONContent } from "@tiptap/core";

/**
 * Renders TipTap JSON content to safe HTML for server-side rendering.
 * Used by the public publishing route.
 */
export function toHtml(doc: JSONContent): string {
  if (!doc?.content) return "";
  return doc.content.map((node) => nodeToHtml(node)).join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}

function inlineToHtml(content: JSONContent[] | undefined): string {
  if (!content) return "";
  return content.map(nodeToHtml).join("");
}

function applyMarks(text: string, marks: any[] | undefined): string {
  if (!marks || marks.length === 0) return text;
  let out = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        out = `<strong>${out}</strong>`;
        break;
      case "italic":
        out = `<em>${out}</em>`;
        break;
      case "underline":
        out = `<u>${out}</u>`;
        break;
      case "strike":
        out = `<s>${out}</s>`;
        break;
      case "code":
        out = `<code>${out}</code>`;
        break;
      case "highlight": {
        const color = mark.attrs?.color || "#fef08a";
        out = `<mark style="background:${escapeAttr(color)}">${out}</mark>`;
        break;
      }
      case "link": {
        const href = escapeAttr(mark.attrs?.href || "#");
        const target = mark.attrs?.target ? ` target="${escapeAttr(mark.attrs.target)}"` : "";
        out = `<a href="${href}" rel="noopener"${target}>${out}</a>`;
        break;
      }
    }
  }
  return out;
}

function nodeToHtml(node: JSONContent): string {
  switch (node.type) {
    case "doc":
      return inlineToHtml(node.content);

    case "text":
      return applyMarks(escapeHtml(node.text || ""), node.marks);

    case "paragraph":
      return `<p>${inlineToHtml(node.content)}</p>`;

    case "heading": {
      const level = Math.min(Math.max(node.attrs?.level ?? 1, 1), 6);
      return `<h${level}>${inlineToHtml(node.content)}</h${level}>`;
    }

    case "bulletList":
      return `<ul>${inlineToHtml(node.content)}</ul>`;

    case "orderedList":
      return `<ol>${inlineToHtml(node.content)}</ol>`;

    case "listItem":
      return `<li>${inlineToHtml(node.content)}</li>`;

    case "taskList":
      return `<ul class="task-list">${inlineToHtml(node.content)}</ul>`;

    case "taskItem": {
      const checked = node.attrs?.checked ? "checked" : "";
      return `<li class="task-item"><input type="checkbox" disabled ${checked}/> ${inlineToHtml(node.content)}</li>`;
    }

    case "blockquote":
      return `<blockquote>${inlineToHtml(node.content)}</blockquote>`;

    case "codeBlock": {
      const lang = node.attrs?.language ? ` class="language-${escapeAttr(node.attrs.language)}"` : "";
      const code = node.content?.map((c) => escapeHtml(c.text || "")).join("") ?? "";
      return `<pre><code${lang}>${code}</code></pre>`;
    }

    case "horizontalRule":
      return `<hr/>`;

    case "hardBreak":
      return `<br/>`;

    case "image": {
      const src = escapeAttr(node.attrs?.src || "");
      const alt = escapeAttr(node.attrs?.alt || "");
      return `<img src="${src}" alt="${alt}"/>`;
    }

    case "table":
      return `<table>${inlineToHtml(node.content)}</table>`;

    case "tableRow":
      return `<tr>${inlineToHtml(node.content)}</tr>`;

    case "tableCell":
      return `<td>${inlineToHtml(node.content)}</td>`;

    case "tableHeader":
      return `<th>${inlineToHtml(node.content)}</th>`;

    case "callout":
      return `<aside class="callout">${inlineToHtml(node.content)}</aside>`;

    case "toggle": {
      const summary = escapeHtml(node.attrs?.summary || "");
      return `<details><summary>${summary}</summary>${inlineToHtml(node.content)}</details>`;
    }

    case "columns":
      return `<div class="columns">${inlineToHtml(node.content)}</div>`;

    case "column":
      return `<div class="column">${inlineToHtml(node.content)}</div>`;

    case "footnote":
      return `<sup class="footnote">${escapeHtml(node.attrs?.content || "")}</sup>`;

    case "pageBreak":
      return `<div class="page-break"></div>`;

    case "mathBlock":
      return `<div class="math">${escapeHtml(node.attrs?.content || "")}</div>`;

    case "mermaidBlock":
      return `<pre class="mermaid">${escapeHtml(node.attrs?.content || "")}</pre>`;

    case "audioBlock":
      return `<audio controls src="${escapeAttr(node.attrs?.src || "")}"></audio>`;

    case "videoBlock":
      return `<video controls src="${escapeAttr(node.attrs?.src || "")}"></video>`;

    case "pdfBlock":
      return `<a href="${escapeAttr(node.attrs?.src || "")}" target="_blank">PDF</a>`;

    case "embed": {
      const src = escapeAttr(node.attrs?.src || "");
      return `<iframe src="${src}" frameborder="0" allowfullscreen></iframe>`;
    }

    case "bookmark": {
      const url = escapeAttr(node.attrs?.url || "");
      const title = escapeHtml(node.attrs?.title || node.attrs?.url || "");
      return `<a class="bookmark" href="${url}" target="_blank" rel="noopener">${title}</a>`;
    }

    default:
      // Fallback: render children if any
      return inlineToHtml(node.content);
  }
}
