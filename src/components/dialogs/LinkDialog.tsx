"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Link2 } from "lucide-react";

interface LinkDialogRequest {
  initialUrl?: string;
  initialText?: string;
  onConfirm: (url: string, text: string) => void;
}

export function LinkDialog() {
  const [request, setRequest] = useState<LinkDialogRequest | null>(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: CustomEvent<LinkDialogRequest>) => {
      setRequest(e.detail);
      setUrl(e.detail.initialUrl ?? "");
      setText(e.detail.initialText ?? "");
    };
    window.addEventListener("markedup:link-dialog", handler as EventListener);
    return () => window.removeEventListener("markedup:link-dialog", handler as EventListener);
  }, []);

  useEffect(() => {
    if (request) {
      requestAnimationFrame(() => urlRef.current?.focus());
    }
  }, [request]);

  const handleSubmit = useCallback(() => {
    if (!url.trim() || !request) return;
    request.onConfirm(url.trim(), text.trim());
    setRequest(null);
    setUrl("");
    setText("");
  }, [url, text, request]);

  const handleClose = useCallback(() => {
    setRequest(null);
    setUrl("");
    setText("");
  }, []);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-xs" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-black/40 dark:text-white/40" />
            <h3 className="text-sm font-medium text-black dark:text-white">Insert Link</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <input
            ref={urlRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") handleClose();
            }}
            placeholder="Paste URL..."
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-[#c9a84c] dark:focus:border-[#d4af37] transition-colors"
          />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") handleClose();
            }}
            placeholder="Link text (optional)"
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-[#c9a84c] dark:focus:border-[#d4af37] transition-colors"
          />
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={handleClose}
            className="rounded-lg px-3 py-1.5 text-xs text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!url.trim()}
            className="rounded-lg bg-[#c9a84c] dark:bg-[#d4af37] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

export function openLinkDialog(opts: {
  initialUrl?: string;
  initialText?: string;
  onConfirm: (url: string, text: string) => void;
}) {
  window.dispatchEvent(
    new CustomEvent("markedup:link-dialog", { detail: opts })
  );
}
