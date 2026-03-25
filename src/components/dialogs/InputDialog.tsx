"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface InputDialogRequest {
  title: string;
  placeholder: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
}

export function InputDialog() {
  const [request, setRequest] = useState<InputDialogRequest | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: CustomEvent<InputDialogRequest>) => {
      setRequest(e.detail);
      setValue("");
    };
    window.addEventListener("markedup:input-dialog", handler as EventListener);
    return () => window.removeEventListener("markedup:input-dialog", handler as EventListener);
  }, []);

  useEffect(() => {
    if (request) {
      // Focus after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [request]);

  const handleSubmit = useCallback(() => {
    if (!value.trim() || !request) return;
    request.onConfirm(value.trim());
    setRequest(null);
    setValue("");
  }, [value, request]);

  const handleClose = useCallback(() => {
    setRequest(null);
    setValue("");
  }, []);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-xs" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1a1a1c] shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-black dark:text-white">{request.title}</h3>
          <button
            onClick={handleClose}
            className="text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") handleClose();
          }}
          placeholder={request.placeholder}
          className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-[#c9a84c] dark:focus:border-[#d4af37] transition-colors"
        />

        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={handleClose}
            className="rounded-lg px-3 py-1.5 text-xs text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="rounded-lg bg-[#c9a84c] dark:bg-[#d4af37] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {request.confirmLabel ?? "Insert"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Helper to open the input dialog from non-React code (slash commands, etc.) */
export function openInputDialog(opts: {
  title: string;
  placeholder: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
}) {
  window.dispatchEvent(
    new CustomEvent("markedup:input-dialog", { detail: opts })
  );
}
