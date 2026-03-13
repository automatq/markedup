"use client";

import React, { useState } from "react";
import { X, Copy, Check, Globe, Lock, Link2, Users } from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  documentTitle: string;
  documentId: string;
}

export function ShareDialog({ open, onClose, documentTitle, documentId }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [access, setAccess] = useState<"private" | "anyone">("private");
  const [email, setEmail] = useState("");

  if (!open) return null;

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/shared/${documentId}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-black/8 dark:border-white/10 bg-white dark:bg-black shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-semibold text-black dark:text-white">Share</h2>
            <p className="text-xs text-black/40 dark:text-white/40 mt-0.5 truncate max-w-[280px]">
              {documentTitle}
            </p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Invite */}
        <div className="px-5 pb-4">
          <div className="flex gap-2">
            <input
              placeholder="Add people by email…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-9 rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/20 dark:focus:border-white/25 transition-colors"
            />
            <button className="h-9 rounded-lg bg-black dark:bg-white px-4 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity">
              Invite
            </button>
          </div>
        </div>

        {/* People with access */}
        <div className="border-t border-black/8 dark:border-white/10 px-5 py-3">
          <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">
            People with access
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6366f1] text-[10px] font-semibold text-white">
                  Y
                </div>
                <div>
                  <p className="text-sm text-black dark:text-white">You</p>
                  <p className="text-[10px] text-black/30 dark:text-white/30">Owner</p>
                </div>
              </div>
              <span className="text-xs text-black/40 dark:text-white/40">Full access</span>
            </div>
          </div>
        </div>

        {/* General access */}
        <div className="border-t border-black/8 dark:border-white/10 px-5 py-3">
          <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">
            General access
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setAccess(access === "private" ? "anyone" : "private")}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-black/70 dark:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
            >
              {access === "private" ? (
                <>
                  <Lock className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                  <span>Restricted</span>
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                  <span>Anyone with the link</span>
                </>
              )}
            </button>
            {access === "anyone" && (
              <select className="rounded-md border border-black/8 dark:border-white/10 bg-transparent px-2 py-1 text-xs text-black/60 dark:text-white/60 outline-none">
                <option>Can view</option>
                <option>Can comment</option>
                <option>Can edit</option>
              </select>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-black/8 dark:border-white/10 px-5 py-3 flex items-center justify-between">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 rounded-lg border border-black/8 dark:border-white/10 px-3 py-2 text-xs font-medium text-black/60 dark:text-white/60 hover:border-black/20 hover:bg-black/[0.04] dark:hover:border-white/25 dark:hover:bg-white/[0.04] transition-all"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button onClick={onClose} className="rounded-lg bg-black dark:bg-white px-4 py-2 text-xs font-medium text-white dark:text-black hover:opacity-80 transition-opacity">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
