"use client";

import React, { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className = "" }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Dynamic import to avoid SSR issues
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains("dark")
            ? "dark"
            : "default",
          securityLevel: "loose",
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: "basis",
          },
          themeVariables: {
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: "12px",
          },
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);

        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to render diagram");
          setSvg("");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4 text-xs text-red-500 ${className}`}>
        Diagram error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black/60 dark:border-white/20 dark:border-t-white/60" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
