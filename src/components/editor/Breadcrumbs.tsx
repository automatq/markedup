"use client";

import React, { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  id: string;
  title: string;
}

interface BreadcrumbsProps {
  documentId: string;
  workspaceId: string;
  onNavigate: (documentId: string) => void;
}

export function Breadcrumbs({ documentId, workspaceId, onNavigate }: BreadcrumbsProps) {
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCrumbs() {
      const chain: BreadcrumbItem[] = [];
      let currentId = documentId;

      // Walk up parent chain (max 10 levels to prevent infinite loops)
      for (let i = 0; i < 10; i++) {
        try {
          const res = await fetch(`/api/documents/${currentId}`);
          if (!res.ok) break;
          const doc = await res.json();

          if (doc.id !== documentId) {
            chain.unshift({ id: doc.id, title: doc.title || "Untitled" });
          }

          if (!doc.parentId) break;
          currentId = doc.parentId;
        } catch {
          break;
        }
      }

      if (!cancelled) setCrumbs(chain);
    }

    fetchCrumbs();
    return () => { cancelled = true; };
  }, [documentId]);

  if (crumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-[11px] text-black/35 dark:text-white/35 mb-2">
      {crumbs.map((crumb, i) => (
        <React.Fragment key={crumb.id}>
          {i > 0 && <ChevronRight className="h-3 w-3 text-black/20 dark:text-white/20" />}
          <button
            onClick={() => onNavigate(crumb.id)}
            className="hover:text-black/60 dark:hover:text-white/60 transition-colors truncate max-w-[120px]"
          >
            {crumb.title}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}
