"use client";

import React, { useMemo, useState } from "react";
import { ChevronRight, Tag, Hash, X } from "lucide-react";

interface TagsPaneProps {
  documents: { id: string; tags?: string | null }[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

interface TagNode {
  name: string;       // Last segment ("backend")
  fullPath: string;   // Full path ("engineering/backend")
  count: number;      // Total docs at this node OR descendants
  ownCount: number;   // Docs tagged exactly with this path
  children: Map<string, TagNode>;
}

function buildTagTree(docs: { tags?: string | null }[]): TagNode {
  const root: TagNode = {
    name: "",
    fullPath: "",
    count: 0,
    ownCount: 0,
    children: new Map(),
  };

  for (const doc of docs) {
    if (!doc.tags) continue;
    const tagList = doc.tags.split(",").map((t) => t.trim()).filter(Boolean);

    for (const tag of tagList) {
      const segments = tag.split("/").map((s) => s.trim()).filter(Boolean);
      let node = root;
      let path = "";

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        path = path ? `${path}/${seg}` : seg;

        if (!node.children.has(seg)) {
          node.children.set(seg, {
            name: seg,
            fullPath: path,
            count: 0,
            ownCount: 0,
            children: new Map(),
          });
        }

        node = node.children.get(seg)!;
        node.count++; // Every ancestor gets counted

        if (i === segments.length - 1) {
          node.ownCount++;
        }
      }
    }
  }

  return root;
}

function TagTreeItem({
  node,
  depth,
  selectedTag,
  onSelectTag,
  expanded,
  toggleExpanded,
}: {
  node: TagNode;
  depth: number;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  expanded: Set<string>;
  toggleExpanded: (path: string) => void;
}) {
  const hasChildren = node.children.size > 0;
  const isExpanded = expanded.has(node.fullPath);
  const isSelected = selectedTag === node.fullPath;

  return (
    <div>
      <div
        className={`group flex w-full items-center rounded-lg text-left transition-all duration-150 ${
          isSelected
            ? "bg-black/[0.06] dark:bg-white/[0.07] text-black dark:text-white"
            : "text-black/50 dark:text-white/50 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-black/80 dark:hover:text-white/80"
        }`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpanded(node.fullPath);
          }}
          className={`flex h-5 w-5 items-center justify-center shrink-0 rounded transition-colors ${
            hasChildren
              ? "text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
              : "text-transparent"
          }`}
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          />
        </button>

        <button
          onClick={() => onSelectTag(isSelected ? null : node.fullPath)}
          className="flex flex-1 items-center gap-2 py-1.5 pr-1 min-w-0 text-xs"
        >
          <Hash className="h-3 w-3 shrink-0 opacity-60" />
          <span className="truncate flex-1">{node.name}</span>
          <span className="text-[10px] text-black/30 dark:text-white/30 shrink-0">
            {node.count}
          </span>
        </button>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {Array.from(node.children.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => (
              <TagTreeItem
                key={child.fullPath}
                node={child}
                depth={depth + 1}
                selectedTag={selectedTag}
                onSelectTag={onSelectTag}
                expanded={expanded}
                toggleExpanded={toggleExpanded}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function TagsPane({ documents, selectedTag, onSelectTag }: TagsPaneProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTagTree(documents), [documents]);
  const hasTags = tree.children.size > 0;

  const toggleExpanded = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  if (!hasTags && !selectedTag) return null;

  return (
    <div className="border-t border-black/[0.06] dark:border-white/[0.06] mt-1 pt-2 px-2">
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="flex w-full items-center gap-1 px-2 pb-1 group"
      >
        <ChevronRight
          className={`h-3 w-3 text-black/30 dark:text-white/30 transition-transform ${
            !collapsed ? "rotate-90" : ""
          }`}
        />
        <Tag className="h-3 w-3 text-black/30 dark:text-white/30" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
          Tags
        </span>
        {selectedTag && (
          <span
            className="ml-auto flex items-center gap-1 rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[9px] text-indigo-500"
            onClick={(e) => {
              e.stopPropagation();
              onSelectTag(null);
            }}
          >
            <span className="truncate max-w-[80px]">{selectedTag}</span>
            <X className="h-2.5 w-2.5" />
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="space-y-0.5">
          {Array.from(tree.children.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((node) => (
              <TagTreeItem
                key={node.fullPath}
                node={node}
                depth={0}
                selectedTag={selectedTag}
                onSelectTag={onSelectTag}
                expanded={expanded}
                toggleExpanded={toggleExpanded}
              />
            ))}
          {!hasTags && (
            <p className="px-3 py-2 text-[10px] text-black/30 dark:text-white/30">
              No tags yet. Add tags to documents to see them here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Returns true if doc matches the selected tag (exact match or descendant).
 * E.g. selectedTag="engineering" matches docs tagged "engineering" or "engineering/backend".
 */
export function docMatchesTag(doc: { tags?: string | null }, selectedTag: string | null): boolean {
  if (!selectedTag) return true;
  if (!doc.tags) return false;
  const tagList = doc.tags.split(",").map((t) => t.trim()).filter(Boolean);
  return tagList.some((t) => t === selectedTag || t.startsWith(selectedTag + "/"));
}
