"use client";

import { ReactNode } from "react";
import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";

interface RoomProps {
  roomId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

const defaultFallback = (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-3">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black/60 dark:border-white/20 dark:border-t-white/60" />
      <p className="text-xs text-black/40 dark:text-white/40">Loading editor…</p>
    </div>
  </div>
);

export function Room({ roomId, children, fallback }: RoomProps) {
  return (
    <RoomProvider id={roomId}>
      <ClientSideSuspense fallback={fallback ?? defaultFallback}>
        {children}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
