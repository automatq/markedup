"use client";

import React, { useState, useCallback, useEffect } from "react";
import { X, Copy, Check, Globe, Lock, Link2 } from "lucide-react";
import { useOrganization } from "@clerk/nextjs";

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
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const { organization, membership } = useOrganization();

  // Fetch existing share link when dialog opens
  useEffect(() => {
    if (!open || !documentId) return;
    setShareToken(null);
  }, [open, documentId]);

  const createShareLink = useCallback(async () => {
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, permission: "view" }),
      });
      if (res.ok) {
        const link = await res.json();
        setShareToken(link.token);
        setAccess("anyone");
        return link.token;
      }
    } catch (err) {
      console.error("Failed to create share link:", err);
    }
    return null;
  }, [documentId]);

  const handleToggleAccess = useCallback(async () => {
    if (access === "private") {
      await createShareLink();
    } else {
      // Disable the share link
      if (shareToken) {
        try {
          await fetch(`/api/share/${shareToken}`, { method: "DELETE" });
        } catch {}
      }
      setShareToken(null);
      setAccess("private");
    }
  }, [access, shareToken, createShareLink]);

  const handleCopyLink = useCallback(async () => {
    let token = shareToken;
    if (!token) {
      token = await createShareLink();
    }
    if (token) {
      const url = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareToken, createShareLink]);

  const handleInvite = useCallback(async () => {
    if (!email.trim() || !organization) return;
    setInviting(true);
    try {
      await organization.inviteMember({ emailAddress: email.trim(), role: "org:member" });
      setInviteSuccess(email.trim());
      setEmail("");
      setTimeout(() => setInviteSuccess(null), 3000);
    } catch (err: any) {
      console.error("Invite error:", err);
      setInviteSuccess(null);
    }
    setInviting(false);
  }, [email, organization]);

  if (!open) return null;

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

        {/* Invite by email (only when in an org) */}
        {organization && (
          <div className="px-5 pb-4">
            <div className="flex gap-2">
              <input
                placeholder="Invite by email…"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="flex-1 h-9 rounded-lg border border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-3 text-sm text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none focus:border-black/20 dark:focus:border-white/25 transition-colors"
              />
              <button
                onClick={handleInvite}
                disabled={inviting || !email.trim()}
                className="h-9 rounded-lg bg-black dark:bg-white px-4 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {inviting ? "…" : "Invite"}
              </button>
            </div>
            {inviteSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                Invited {inviteSuccess} to {organization.name}
              </p>
            )}
          </div>
        )}

        {/* Organization info */}
        {organization && (
          <div className="border-t border-black/8 dark:border-white/10 px-5 py-3">
            <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">
              Organization
            </p>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/[0.06] dark:bg-white/[0.06] text-[10px] font-semibold text-black/60 dark:text-white/60">
                {organization.name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-black dark:text-white">{organization.name}</p>
                <p className="text-[10px] text-black/30 dark:text-white/30">
                  All members can access workspace documents
                </p>
              </div>
            </div>
          </div>
        )}

        {/* General access — share link */}
        <div className="border-t border-black/8 dark:border-white/10 px-5 py-3">
          <p className="text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 mb-2">
            Link sharing
          </p>
          <div className="flex items-center justify-between">
            <button
              onClick={handleToggleAccess}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-black/70 dark:text-white/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
            >
              {access === "private" ? (
                <>
                  <Lock className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                  <span>Restricted</span>
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Anyone with the link</span>
                </>
              )}
            </button>
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
