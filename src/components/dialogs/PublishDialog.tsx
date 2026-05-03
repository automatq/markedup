"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Globe, Copy, Check, ExternalLink, X, Loader2 } from "lucide-react";

interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
}

interface PublishLink {
  id: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  enabled: boolean;
}

export function PublishDialog({ open, onClose, documentId, documentTitle }: PublishDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [link, setLink] = useState<PublishLink | null>(null);
  const [slug, setSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/share/publish?documentId=${documentId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.link) {
          setLink(data.link);
          setPublished(data.published);
          setSlug(data.link.slug ?? "");
          setSeoTitle(data.link.seoTitle ?? "");
          setSeoDescription(data.link.seoDescription ?? "");
        } else {
          setPublished(false);
          setLink(null);
          setSlug("");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, documentId]);

  const publicUrl = link?.slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${link.slug}`
    : "";

  const handlePublish = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/share/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          publish: true,
          slug: slug.trim() || undefined,
          seoTitle: seoTitle.trim() || undefined,
          seoDescription: seoDescription.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLink(data.link);
        setPublished(true);
        setSlug(data.link.slug);
      }
    } catch {}
    setSaving(false);
  }, [documentId, slug, seoTitle, seoDescription]);

  const handleUnpublish = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/share/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, publish: false }),
      });
      if (res.ok) {
        setPublished(false);
      }
    } catch {}
    setSaving(false);
  }, [documentId]);

  const handleCopy = useCallback(() => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [publicUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a] shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/8 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10">
              <Globe className="h-4 w-4 text-indigo-500" />
            </div>
            <h2 className="text-sm font-semibold text-black dark:text-white">
              Publish to web
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-black/30 dark:text-white/30" />
            </div>
          ) : published && link ? (
            <>
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Live at {publicUrl}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 text-xs bg-black/[0.03] dark:bg-white/[0.03] rounded-lg px-3 py-2 text-black/70 dark:text-white/70 outline-none border border-black/8 dark:border-white/8"
                />
                <button
                  onClick={handleCopy}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 dark:border-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  title="Copy URL"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/8 dark:border-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                  title="Open"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-black/60 dark:text-white/60 mb-4">
              Publish &ldquo;{documentTitle}&rdquo; as a public page anyone can read at a clean URL.
            </p>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-1.5">
                URL slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-black/40 dark:text-white/40">/p/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="my-published-page"
                  className="flex-1 text-sm bg-black/[0.03] dark:bg-white/[0.03] rounded-lg px-3 py-2 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none border border-transparent focus:border-black/15 dark:focus:border-white/15 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-1.5">
                SEO title
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={documentTitle}
                className="w-full text-sm bg-black/[0.03] dark:bg-white/[0.03] rounded-lg px-3 py-2 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none border border-transparent focus:border-black/15 dark:focus:border-white/15 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium mb-1.5">
                Meta description
              </label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Short description shown in search results and link previews..."
                rows={3}
                className="w-full text-sm bg-black/[0.03] dark:bg-white/[0.03] rounded-lg px-3 py-2 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 outline-none border border-transparent focus:border-black/15 dark:focus:border-white/15 transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-black/8 dark:border-white/10">
          {published ? (
            <button
              onClick={handleUnpublish}
              disabled={saving}
              className="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              Unpublish
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={handlePublish}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-black dark:bg-white px-4 py-1.5 text-xs font-medium text-white dark:text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {published ? "Save changes" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
