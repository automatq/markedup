/**
 * Export the current document as PDF using the browser's print dialog.
 * Creates a temporary print-optimized view and triggers window.print().
 */
export function printDocument(title: string) {
  // Inject print styles if not already present
  if (!document.getElementById("markedup-print-styles")) {
    const style = document.createElement("style");
    style.id = "markedup-print-styles";
    style.textContent = `
      @media print {
        /* Hide everything except the editor content */
        body > *:not(.print-container) {
          display: none !important;
        }

        .print-container {
          display: block !important;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          background: white;
          color: black;
          z-index: 999999;
        }

        /* Page setup */
        @page {
          margin: 1in;
          size: letter;
        }

        /* Page breaks */
        [data-type="page-break"] {
          page-break-after: always;
          border: none !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        [data-type="page-break"] span {
          display: none !important;
        }

        /* Reset dark mode for print */
        .ProseMirror,
        .ProseMirror * {
          color: black !important;
          background: white !important;
          border-color: #ddd !important;
        }

        .ProseMirror h1 { font-size: 24pt; margin-top: 0; }
        .ProseMirror h2 { font-size: 18pt; }
        .ProseMirror h3 { font-size: 14pt; }
        .ProseMirror p { font-size: 11pt; line-height: 1.6; }

        /* Code blocks */
        .ProseMirror pre {
          border: 1px solid #ddd !important;
          padding: 8pt;
          font-size: 9pt;
          page-break-inside: avoid;
        }

        /* Tables */
        .ProseMirror table {
          page-break-inside: avoid;
        }

        /* Images */
        .ProseMirror img {
          max-width: 100%;
          page-break-inside: avoid;
        }

        /* Hide interactive elements */
        .ProseMirror [contenteditable] {
          outline: none !important;
        }

        /* Footnotes at bottom */
        .print-footnotes {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #ccc;
          font-size: 9pt;
        }
      }
    `;
    document.head.appendChild(style);
  }

  window.print();
}

/**
 * Trigger a file download of a Blob with the given filename.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
