"use client";

import React, { useState } from "react";
import { X, ImagePlus, Smile, Type, Maximize } from "lucide-react";

export type FontOption =
  | "geist"
  | "geist-mono"
  | "inter"
  | "dm-sans"
  | "space-grotesk"
  | "jetbrains-mono"
  | "lora"
  | "source-serif"
  | "ibm-plex-sans"
  | "ibm-plex-mono"
  | "system-sans"
  | "system-serif"
  | "system-mono";

export type LayoutMode = "wide" | "full" | "narrow" | "zen";

export interface PageCustomization {
  coverUrl: string;
  icon: string;
  font: FontOption;
  layout: LayoutMode;
}

/** CSS classes for each layout mode */
export function layoutClass(layout: LayoutMode): string {
  const map: Record<LayoutMode, string> = {
    wide: "max-w-5xl",
    full: "max-w-full px-12",
    narrow: "max-w-2xl",
    zen: "max-w-xl",
  };
  return map[layout] ?? "max-w-5xl";
}

interface LayoutEntry {
  key: LayoutMode;
  label: string;
  description: string;
  widthPreview: string; // tailwind width class for the visual indicator
}

/** Maps font option to the CSS class that applies it */
export function fontClass(font: FontOption): string {
  const map: Record<FontOption, string> = {
    "geist": "font-[family-name:var(--font-geist-sans)]",
    "geist-mono": "font-[family-name:var(--font-geist-mono)]",
    "inter": "font-[family-name:var(--font-inter)]",
    "dm-sans": "font-[family-name:var(--font-dm-sans)]",
    "space-grotesk": "font-[family-name:var(--font-space-grotesk)]",
    "jetbrains-mono": "font-[family-name:var(--font-jetbrains-mono)]",
    "lora": "font-[family-name:var(--font-lora)]",
    "source-serif": "font-[family-name:var(--font-source-serif)]",
    "ibm-plex-sans": "font-[family-name:var(--font-ibm-plex-sans)]",
    "ibm-plex-mono": "font-[family-name:var(--font-ibm-plex-mono)]",
    "system-sans": "font-sans",
    "system-serif": "font-serif",
    "system-mono": "font-mono",
  };
  return map[font] ?? "font-sans";
}

interface CustomizePageDialogProps {
  open: boolean;
  onClose: () => void;
  current: PageCustomization;
  onSave: (customization: PageCustomization) => void;
}

const COVER_PRESETS = [
  "",
  // Bronze
  "linear-gradient(135deg, #cd7f32 0%, #a0522d 50%, #daa06d 100%)",
  // Gold
  "linear-gradient(135deg, #d4af37 0%, #ffd700 50%, #b8860b 100%)",
  // Silver
  "linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #a8a8a8 100%)",
  // Platinum
  "linear-gradient(135deg, #e5e4e2 0%, #c0bfbd 50%, #d8d8d6 100%)",
  // Rose Gold
  "linear-gradient(135deg, #b76e79 0%, #e8b4b8 50%, #c9878f 100%)",
  // Copper
  "linear-gradient(135deg, #b87333 0%, #da8a67 50%, #8c5523 100%)",
  // Titanium
  "linear-gradient(135deg, #878681 0%, #b0afab 50%, #6e6d69 100%)",
  // Gunmetal
  "linear-gradient(135deg, #2a3439 0%, #536267 50%, #3d4b51 100%)",
  // Brass
  "linear-gradient(135deg, #b5a642 0%, #d4c36a 50%, #8e7f33 100%)",
  // Chrome
  "linear-gradient(135deg, #dfe0e2 0%, #b9bbbe 50%, #f0f1f3 100%)",
];

const ICON_PRESETS = ["", "📄", "📝", "📋", "🎯", "🚀", "💡", "🔧", "📊", "🏗️", "🎨", "📚", "⚡", "🔥", "✨", "🌟"];

const LAYOUTS: LayoutEntry[] = [
  { key: "zen", label: "Zen", description: "Focused, narrow column", widthPreview: "w-5" },
  { key: "narrow", label: "Narrow", description: "Compact reading width", widthPreview: "w-8" },
  { key: "wide", label: "Wide", description: "Comfortable working width", widthPreview: "w-12" },
  { key: "full", label: "Full", description: "Edge-to-edge content", widthPreview: "w-full" },
];

interface FontEntry {
  key: FontOption;
  label: string;
  category: "sans" | "serif" | "mono";
}

const FONTS: FontEntry[] = [
  { key: "geist", label: "Geist", category: "sans" },
  { key: "inter", label: "Inter", category: "sans" },
  { key: "dm-sans", label: "DM Sans", category: "sans" },
  { key: "space-grotesk", label: "Space Grotesk", category: "sans" },
  { key: "ibm-plex-sans", label: "IBM Plex Sans", category: "sans" },
  { key: "system-sans", label: "System Sans", category: "sans" },
  { key: "lora", label: "Lora", category: "serif" },
  { key: "source-serif", label: "Source Serif", category: "serif" },
  { key: "system-serif", label: "System Serif", category: "serif" },
  { key: "geist-mono", label: "Geist Mono", category: "mono" },
  { key: "jetbrains-mono", label: "JetBrains Mono", category: "mono" },
  { key: "ibm-plex-mono", label: "IBM Plex Mono", category: "mono" },
  { key: "system-mono", label: "System Mono", category: "mono" },
];

export function CustomizePageDialog({ open, onClose, current, onSave }: CustomizePageDialogProps) {
  const [cover, setCover] = useState(current.coverUrl);
  const [icon, setIcon] = useState(current.icon);
  const [font, setFont] = useState<FontOption>(current.font);
  const [layout, setLayout] = useState<LayoutMode>(current.layout);
  const [coverInput, setCoverInput] = useState("");

  if (!open) return null;

  const fontsByCategory = {
    sans: FONTS.filter((f) => f.category === "sans"),
    serif: FONTS.filter((f) => f.category === "serif"),
    mono: FONTS.filter((f) => f.category === "mono"),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 max-h-[85vh] rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-black dark:text-white">Customize page</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-4 space-y-5 overflow-y-auto flex-1">
          {/* Cover */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ImagePlus className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              <span className="text-xs font-medium text-black/60 dark:text-white/60">Cover</span>
            </div>
            <div
              className="h-20 w-full rounded-lg border border-black/8 dark:border-white/10 mb-2 overflow-hidden"
              style={{ background: cover || "rgba(0,0,0,0.03)" }}
            >
              {!cover && (
                <div className="flex h-full items-center justify-center text-xs text-black/20 dark:text-white/20">
                  No cover
                </div>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {COVER_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => setCover(preset)}
                  className={`h-8 w-8 rounded-md border transition-all ${
                    cover === preset
                      ? "border-black dark:border-white scale-110"
                      : "border-black/10 dark:border-white/10 hover:scale-105"
                  }`}
                  style={{ background: preset || "rgba(0,0,0,0.03)" }}
                >
                  {!preset && <X className="h-3 w-3 mx-auto text-black/20 dark:text-white/20" />}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                placeholder="Or paste image URL…"
                value={coverInput}
                onChange={(e) => setCoverInput(e.target.value)}
                className="flex-1 h-8 rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 text-xs text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 outline-none focus:border-black/20 dark:focus:border-white/25 transition-colors"
              />
              <button
                onClick={() => { if (coverInput) { setCover(`url(${coverInput}) center/cover`); setCoverInput(""); } }}
                className="h-8 rounded-lg border border-black/8 dark:border-white/10 px-3 text-xs font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/25 transition-colors"
              >
                Set
              </button>
            </div>
          </div>

          {/* Icon */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Smile className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              <span className="text-xs font-medium text-black/60 dark:text-white/60">Icon</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {ICON_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => setIcon(preset)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all ${
                    icon === preset
                      ? "border-black dark:border-white scale-110"
                      : "border-black/8 dark:border-white/10 hover:scale-105 hover:border-black/20 dark:hover:border-white/25"
                  }`}
                >
                  {preset || <X className="h-3 w-3 text-black/20 dark:text-white/20" />}
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Type className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              <span className="text-xs font-medium text-black/60 dark:text-white/60">Font</span>
            </div>

            {(["sans", "serif", "mono"] as const).map((category) => (
              <div key={category} className="mb-3">
                <p className="text-[9px] uppercase tracking-widest text-black/25 dark:text-white/25 font-medium mb-1.5">
                  {category}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {fontsByCategory[category].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFont(f.key)}
                      className={`rounded-lg border px-3 py-2 text-left transition-all ${
                        font === f.key
                          ? "border-black dark:border-white bg-black/[0.04] dark:bg-white/[0.04]"
                          : "border-black/8 dark:border-white/10 hover:border-black/20 dark:hover:border-white/25"
                      }`}
                    >
                      <span className={`text-sm text-black dark:text-white ${fontClass(f.key)}`}>
                        Aa
                      </span>
                      <p className="text-[10px] text-black/40 dark:text-white/40 mt-0.5">{f.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Layout */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Maximize className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              <span className="text-xs font-medium text-black/60 dark:text-white/60">Layout</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {LAYOUTS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLayout(l.key)}
                  className={`rounded-lg border px-2 py-2.5 text-center transition-all ${
                    layout === l.key
                      ? "border-black dark:border-white bg-black/[0.04] dark:bg-white/[0.04]"
                      : "border-black/8 dark:border-white/10 hover:border-black/20 dark:hover:border-white/25"
                  }`}
                >
                  {/* Visual width indicator */}
                  <div className="flex justify-center mb-1.5">
                    <div className="h-6 flex flex-col justify-center gap-[3px] w-full px-1">
                      <div className={`h-[2px] rounded-full mx-auto bg-black/20 dark:bg-white/20 ${l.widthPreview}`} />
                      <div className={`h-[2px] rounded-full mx-auto bg-black/10 dark:bg-white/10 ${l.widthPreview}`} />
                      <div className={`h-[2px] rounded-full mx-auto bg-black/10 dark:bg-white/10 ${l.widthPreview === "w-full" ? "w-3/4" : l.widthPreview}`} />
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-black/70 dark:text-white/70">{l.label}</p>
                  <p className="text-[8px] text-black/30 dark:text-white/30 mt-0.5 leading-tight">{l.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-black/8 dark:border-white/10 px-5 py-3 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="rounded-lg border border-black/8 dark:border-white/10 px-4 py-2 text-xs font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/25 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onSave({ coverUrl: cover, icon, font, layout }); onClose(); }}
            className="rounded-lg bg-black dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-black hover:opacity-80 transition-opacity"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
