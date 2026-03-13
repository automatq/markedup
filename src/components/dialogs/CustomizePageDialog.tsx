"use client";

import React, { useState } from "react";
import { X, ImagePlus, Smile, Type } from "lucide-react";

export interface PageCustomization {
  coverUrl: string;
  icon: string;
  font: "mono" | "sans" | "serif";
}

interface CustomizePageDialogProps {
  open: boolean;
  onClose: () => void;
  current: PageCustomization;
  onSave: (customization: PageCustomization) => void;
}

const COVER_PRESETS = [
  "",
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
];

const ICON_PRESETS = ["", "📄", "📝", "📋", "🎯", "🚀", "💡", "🔧", "📊", "🏗️", "🎨", "📚", "⚡", "🔥", "✨", "🌟"];

const FONTS: Array<{ key: PageCustomization["font"]; label: string; preview: string }> = [
  { key: "mono", label: "Mono", preview: "font-mono" },
  { key: "sans", label: "Sans", preview: "font-sans" },
  { key: "serif", label: "Serif", preview: "font-serif" },
];

export function CustomizePageDialog({ open, onClose, current, onSave }: CustomizePageDialogProps) {
  const [cover, setCover] = useState(current.coverUrl);
  const [icon, setIcon] = useState(current.icon);
  const [font, setFont] = useState(current.font);
  const [coverInput, setCoverInput] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-black dark:text-white">Customize page</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-4 space-y-5">
          {/* Cover */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ImagePlus className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              <span className="text-xs font-medium text-black/60 dark:text-white/60">Cover</span>
            </div>
            {/* Preview */}
            <div
              className="h-20 w-full rounded-lg border border-black/8 dark:border-white/10 mb-2 overflow-hidden"
              style={{
                background: cover || "rgba(0,0,0,0.03)",
              }}
            >
              {!cover && (
                <div className="flex h-full items-center justify-center text-xs text-black/20 dark:text-white/20">
                  No cover
                </div>
              )}
            </div>
            {/* Presets */}
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
            {/* URL input */}
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
            <div className="flex items-center gap-2 mb-2">
              <Type className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              <span className="text-xs font-medium text-black/60 dark:text-white/60">Font</span>
            </div>
            <div className="flex gap-2">
              {FONTS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFont(f.key)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-center transition-all ${
                    font === f.key
                      ? "border-black dark:border-white bg-black/[0.04] dark:bg-white/[0.04]"
                      : "border-black/8 dark:border-white/10 hover:border-black/20 dark:hover:border-white/25"
                  }`}
                >
                  <span className={`text-sm ${f.preview} text-black dark:text-white`}>Aa</span>
                  <p className="text-[10px] text-black/40 dark:text-white/40 mt-0.5">{f.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-black/8 dark:border-white/10 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-black/8 dark:border-white/10 px-4 py-2 text-xs font-medium text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/25 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onSave({ coverUrl: cover, icon, font }); onClose(); }}
            className="rounded-lg bg-black dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-black hover:opacity-80 transition-opacity"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
