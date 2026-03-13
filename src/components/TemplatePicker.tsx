"use client";

import React, { useState } from "react";
import { templates, DocumentTemplate } from "@/lib/templates";
import {
  Users,
  Target,
  BookOpen,
  Bug,
  FileCode,
  CalendarCheck,
  File,
  X,
  Search,
  MessageCircle,
  LayoutList,
  BookMarked,
  Palette,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Users,
  Target,
  BookOpen,
  Bug,
  FileCode,
  CalendarCheck,
  File,
  MessageCircle,
  LayoutList,
  BookMarked,
  Palette,
  Search,
};

const categories = [
  { key: "all", label: "All Templates" },
  { key: "work", label: "Work" },
  { key: "engineering", label: "Engineering" },
  { key: "design", label: "Design" },
  { key: "personal", label: "Personal" },
  { key: "general", label: "General" },
];

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: DocumentTemplate) => void;
}

function TemplateCard({
  template,
  onSelect,
  index,
}: {
  template: DocumentTemplate;
  onSelect: () => void;
  index: number;
}) {
  const Icon = iconMap[template.icon] ?? File;

  return (
    <button
      onClick={onSelect}
      className="group flex flex-col rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-white/[0.02] text-left transition-all duration-200 hover:border-black/20 dark:hover:border-white/20 hover:shadow-md dark:hover:shadow-white/5 active:scale-[0.98] animate-fade-in-up overflow-hidden"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Preview area */}
      <div
        className="relative px-3.5 pt-3.5 pb-2"
        style={{ backgroundColor: `${template.color}08` }}
      >
        <div className="flex items-start gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{
              backgroundColor: `${template.color}18`,
              color: template.color,
            }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-black dark:text-white leading-tight">
              {template.title}
            </p>
            <p className="text-[11px] text-black/40 dark:text-white/40 mt-0.5 leading-tight">
              {template.description}
            </p>
          </div>
        </div>
      </div>

      {/* Content preview — mini document outline */}
      <div className="px-3.5 py-2.5 flex-1">
        <div className="space-y-1.5">
          {template.preview.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="h-1 w-1 rounded-full shrink-0"
                style={{ backgroundColor: template.color }}
              />
              <span className="text-[11px] text-black/50 dark:text-white/40 truncate">
                {line}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover footer */}
      <div className="px-3.5 pb-3 pt-1">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: template.color }}>
          <span>Use template</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </button>
  );
}

export function TemplatePicker({
  open,
  onClose,
  onSelect,
}: TemplatePickerProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  if (!open) return null;

  const filtered = templates.filter((t) => {
    const matchesCategory =
      activeCategory === "all" || t.category === activeCategory;
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] mx-4 flex flex-col rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-black dark:text-white">
                New Document
              </h2>
              <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">
                Choose a template or start from scratch
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-black/30 dark:text-white/30" />
            <input
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="h-9 w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] pl-9 pr-3 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/20 dark:focus:border-white/25 transition-colors"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === cat.key
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((template, i) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={i}
                onSelect={() => {
                  onSelect(template);
                  onClose();
                }}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-black/30 dark:text-white/30">
                No templates match your search
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
