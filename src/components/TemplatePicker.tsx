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
};

const categories = [
  { key: "all", label: "All" },
  { key: "work", label: "Work" },
  { key: "engineering", label: "Engineering" },
  { key: "personal", label: "Personal" },
  { key: "general", label: "General" },
];

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: DocumentTemplate) => void;
}

export function TemplatePicker({ open, onClose, onSelect }: TemplatePickerProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  if (!open) return null;

  const filtered = templates.filter((t) => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
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
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-semibold text-black dark:text-white">
              Choose a template
            </h2>
            <p className="text-xs text-black/40 dark:text-white/40 mt-0.5">
              Start with a structure or go blank
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <input
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="h-9 w-full rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/20 dark:focus:border-white/25 transition-colors"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-5 pb-3">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat.key
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template list */}
        <div className="max-h-80 overflow-y-auto px-3 pb-4">
          <div className="space-y-1.5">
            {filtered.map((template, i) => {
              const Icon = iconMap[template.icon] ?? File;
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    onSelect(template);
                    onClose();
                  }}
                  className="group flex w-full items-center gap-4 rounded-xl border border-black/8 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3.5 text-left transition-all duration-150 hover:border-black/20 hover:bg-black/[0.05] dark:hover:border-white/25 dark:hover:bg-white/[0.06] active:scale-[0.99] animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 group-hover:bg-black/10 group-hover:text-black/80 dark:group-hover:bg-white/10 dark:group-hover:text-white transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black dark:text-white">
                      {template.title}
                    </p>
                    <p className="text-xs text-black/40 dark:text-white/40 truncate">
                      {template.description}
                    </p>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-black/15 dark:text-white/15 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-black/40 dark:group-hover:text-white/40 shrink-0"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-xs text-black/30 dark:text-white/30">
                No templates match your search
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
