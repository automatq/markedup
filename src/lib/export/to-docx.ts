import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
  PageBreak,
} from "docx";

type JSONContent = any;

/**
 * Convert TipTap JSON document to DOCX format.
 * Returns a Blob of the generated .docx file.
 */
export async function toDocx(
  doc: JSONContent,
  title = "Document"
): Promise<Blob> {
  const children = doc.content
    ? doc.content.flatMap((node: JSONContent) => nodeToDocx(node))
    : [];

  const document = new Document({
    title,
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBlob(document);
}

function nodeToDocx(node: JSONContent): any[] {
  switch (node.type) {
    case "heading": {
      const level = node.attrs?.level ?? 1;
      const headingLevel =
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;
      return [
        new Paragraph({
          heading: headingLevel,
          children: inlineToDocx(node.content),
        }),
      ];
    }

    case "paragraph":
      return [
        new Paragraph({
          children: inlineToDocx(node.content),
        }),
      ];

    case "bulletList":
      return (
        node.content?.flatMap((li: JSONContent) =>
          listItemToDocx(li, "bullet")
        ) ?? []
      );

    case "orderedList":
      return (
        node.content?.flatMap((li: JSONContent, i: number) =>
          listItemToDocx(li, "number")
        ) ?? []
      );

    case "taskList":
      return (
        node.content?.flatMap((li: JSONContent) => {
          const checked = li.attrs?.checked ?? false;
          const text = inlineToDocx(li.content?.[0]?.content);
          return [
            new Paragraph({
              children: [
                new TextRun({ text: checked ? "[x] " : "[ ] " }),
                ...text,
              ],
            }),
          ];
        }) ?? []
      );

    case "blockquote": {
      // Render blockquote children as indented paragraphs
      const innerContent =
        node.content?.flatMap((child: JSONContent) => {
          if (child.type === "paragraph") {
            return [
              new Paragraph({
                indent: { left: 720 },
                children: inlineToDocx(child.content),
              }),
            ];
          }
          return nodeToDocx(child);
        }) ?? [];
      return innerContent;
    }

    case "codeBlock": {
      const code =
        node.content?.map((c: JSONContent) => c.text ?? "").join("") ?? "";
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: code,
              font: "Courier New",
              size: 20,
            }),
          ],
          shading: { fill: "f5f5f5" },
        }),
      ];
    }

    case "callout": {
      const emoji = node.attrs?.emoji ?? "💡";
      const calloutChildren =
        node.content?.flatMap((child: JSONContent, i: number) => {
          if (child.type === "paragraph") {
            const runs = inlineToDocx(child.content);
            if (i === 0) {
              return [
                new Paragraph({
                  children: [new TextRun({ text: `${emoji} ` }), ...runs],
                }),
              ];
            }
            return [new Paragraph({ children: runs })];
          }
          return nodeToDocx(child);
        }) ?? [];
      return calloutChildren;
    }

    case "horizontalRule":
      return [
        new Paragraph({
          children: [new TextRun({ text: "─".repeat(50) })],
          alignment: AlignmentType.CENTER,
        }),
      ];

    case "pageBreak":
      return [
        new Paragraph({
          children: [new PageBreak()],
        }),
      ];

    case "image": {
      // For DOCX, images from URLs can't be embedded easily
      // Include alt text and URL as a fallback
      const alt = node.attrs?.alt ?? "Image";
      const src = node.attrs?.src ?? "";
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `[${alt}](${src})`,
              italics: true,
              color: "666666",
            }),
          ],
        }),
      ];
    }

    case "table": {
      const rows =
        node.content?.map((row: JSONContent) => {
          const cells =
            row.content?.map((cell: JSONContent) => {
              const cellContent =
                cell.content?.flatMap((child: JSONContent) =>
                  nodeToDocx(child)
                ) ?? [];
              return new DocxTableCell({
                children:
                  cellContent.length > 0
                    ? cellContent
                    : [new Paragraph({ children: [] })],
              });
            }) ?? [];
          return new DocxTableRow({ children: cells });
        }) ?? [];

      if (rows.length === 0) return [];
      return [
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ];
    }

    case "toggle": {
      // Render as a collapsible section (just render content with a header)
      return (
        node.content?.flatMap((child: JSONContent) => nodeToDocx(child)) ?? []
      );
    }

    case "mathBlock":
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: node.attrs?.content ?? "",
              font: "Cambria Math",
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ];

    case "mermaidBlock":
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `[Diagram: ${node.attrs?.content ?? ""}]`,
              italics: true,
              color: "666666",
              font: "Courier New",
              size: 20,
            }),
          ],
        }),
      ];

    case "columns":
      // Flatten columns into sequential content
      return (
        node.content?.flatMap((col: JSONContent) =>
          col.content?.flatMap((child: JSONContent) => nodeToDocx(child)) ?? []
        ) ?? []
      );

    case "embed":
    case "bookmark":
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: node.attrs?.url || node.attrs?.src || "[Embed]",
              color: "0066cc",
              underline: {},
            }),
          ],
        }),
      ];

    default:
      // Fallback: try to extract inline content
      if (node.content) {
        return node.content.flatMap((child: JSONContent) =>
          nodeToDocx(child)
        );
      }
      return [];
  }
}

function inlineToDocx(content?: JSONContent[]): TextRun[] {
  if (!content) return [];

  return content.flatMap((node: JSONContent) => {
    if (node.type === "backlink") {
      return [
        new TextRun({
          text: `[[${node.attrs?.title ?? ""}]]`,
          color: "0066cc",
        }),
      ];
    }

    if (node.type === "footnote") {
      return [
        new TextRun({
          text: `[${node.attrs?.content ?? ""}]`,
          superScript: true,
          size: 16,
        }),
      ];
    }

    let text = node.text ?? "";
    if (!text) return [];

    const marks = node.marks ?? [];
    const isBold = marks.some((m: any) => m.type === "bold");
    const isItalic = marks.some((m: any) => m.type === "italic");
    const isStrike = marks.some((m: any) => m.type === "strike");
    const isUnderline = marks.some((m: any) => m.type === "underline");
    const isCode = marks.some((m: any) => m.type === "code");
    const link = marks.find((m: any) => m.type === "link");
    const color = marks.find((m: any) => m.type === "textStyle")?.attrs?.color;

    const run = new TextRun({
      text,
      bold: isBold,
      italics: isItalic,
      strike: isStrike,
      underline: isUnderline ? {} : undefined,
      font: isCode ? "Courier New" : undefined,
      size: isCode ? 20 : undefined,
      color: color?.replace("#", "") || undefined,
    });

    return [run];
  });
}

function listItemToDocx(li: JSONContent, type: "bullet" | "number"): any[] {
  return (
    li.content?.flatMap((child: JSONContent) => {
      if (child.type === "paragraph") {
        return [
          new Paragraph({
            bullet: type === "bullet" ? { level: 0 } : undefined,
            numbering:
              type === "number"
                ? { reference: "default-numbering", level: 0 }
                : undefined,
            children: inlineToDocx(child.content),
          }),
        ];
      }
      return nodeToDocx(child);
    }) ?? []
  );
}
