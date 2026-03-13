"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SharedDocumentPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = params?.token;
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (res.ok) {
          const data = await res.json();
          // Redirect to the actual document
          router.replace(`/${data.workspaceId}/${data.documentId}`);
        } else {
          const body = await res.json().catch(() => ({}));
          setError(body.error || "This link is no longer available.");
        }
      } catch {
        setError("Failed to load shared document.");
      }
      setLoading(false);
    })();
  }, [params?.token, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black/60 dark:border-white/20 dark:border-t-white/60" />
          <p className="text-xs text-black/40 dark:text-white/40">Opening shared document…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-black dark:text-white mb-2">
          Link unavailable
        </h1>
        <p className="text-sm text-black/50 dark:text-white/50">{error}</p>
      </div>
    </div>
  );
}
