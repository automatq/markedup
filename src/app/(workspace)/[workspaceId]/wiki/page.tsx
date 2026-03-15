"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WikiOverview } from "@/components/wiki/WikiOverview";

export default function WikiPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params?.workspaceId ?? "";
  const [ready, setReady] = useState(false);

  // Ensure workspace has at least one document (create if empty)
  useEffect(() => {
    if (!workspaceId) return;

    (async () => {
      try {
        const res = await fetch(`/api/documents?workspaceId=${workspaceId}`);
        if (res.ok) {
          const docs = await res.json();
          if (docs.length === 0) {
            await fetch("/api/documents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workspaceId, title: "Getting Started" }),
            });
          }
        }
      } catch (err) {
        console.error("Failed to check workspace:", err);
      }
      setReady(true);
    })();
  }, [workspaceId]);

  if (!ready) {
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
    <WikiOverview
      workspaceId={workspaceId}
      onNavigateToDocument={(docId) => router.push(`/${workspaceId}/${docId}`)}
    />
  );
}
