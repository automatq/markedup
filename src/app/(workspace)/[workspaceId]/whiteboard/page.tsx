"use client";

import React from "react";
import { useParams } from "next/navigation";
import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { LiveList } from "@liveblocks/client";
import { Whiteboard } from "@/components/whiteboard/Whiteboard";

export default function WhiteboardPage() {
  const params = useParams<{ workspaceId: string }>();
  const roomId = `whiteboard:${params?.workspaceId}`;

  return (
    <div className="h-full w-full">
      <RoomProvider
        id={roomId}
        initialPresence={{ cursor: null } as any}
        initialStorage={{ shapes: new LiveList([]) } as any}
      >
        <ClientSideSuspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black/60 dark:border-white/20 dark:border-t-white/60" />
                <p className="text-xs text-black/40 dark:text-white/40">Loading whiteboard...</p>
              </div>
            </div>
          }
        >
          <Whiteboard />
        </ClientSideSuspense>
      </RoomProvider>
    </div>
  );
}
