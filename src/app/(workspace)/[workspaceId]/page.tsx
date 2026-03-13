"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function WorkspaceIndexPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const workspaceId = params?.workspaceId;
    if (!workspaceId) return;

    // Fetch documents — if any exist, redirect to the first one.
    // If none exist, create one and redirect.
    (async () => {
      try {
        const res = await fetch(`/api/documents?workspaceId=${workspaceId}`);
        if (res.ok) {
          const docs = await res.json();
          if (docs.length > 0) {
            router.replace(`/${workspaceId}/${docs[0].id}`);
            return;
          }
        }

        // No documents — create the first one
        const createRes = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, title: "Getting Started" }),
        });

        if (createRes.ok) {
          const doc = await createRes.json();
          router.replace(`/${workspaceId}/${doc.id}`);
          return;
        }
      } catch (err) {
        console.error("Failed to load workspace:", err);
      }
      setLoading(false);
    })();
  }, [params?.workspaceId, router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black/60 dark:border-white/20 dark:border-t-white/60" />
          <p className="text-xs text-black/40 dark:text-white/40">
            Loading workspace…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-black/40 dark:text-white/40">
        Select or create a document to get started.
      </p>
    </div>
  );
}
