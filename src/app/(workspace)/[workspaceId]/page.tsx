"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function WorkspaceIndexPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params?.workspaceId ?? "";

  useEffect(() => {
    if (workspaceId) {
      router.replace(`/${workspaceId}/overview`);
    }
  }, [workspaceId, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black/60 dark:border-white/20 dark:border-t-white/60" />
    </div>
  );
}
