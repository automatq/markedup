"use client";

import React from "react";
import { useParams } from "next/navigation";
import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { LiveMap, LiveObject } from "@liveblocks/client";
import { Spreadsheet } from "@/components/spreadsheet/Spreadsheet";

export default function SpreadsheetPage() {
  const params = useParams<{ workspaceId: string }>();
  const roomId = `spreadsheet:${params?.workspaceId}`;

  return (
    <div className="h-full w-full">
      <RoomProvider
        id={roomId}
        initialPresence={{ selectedCell: null } as any}
        initialStorage={{
          cells: new LiveMap(),
          meta: new LiveObject({
            colCount: 26,
            rowCount: 100,
            colWidths: JSON.stringify(Array(26).fill(120)),
            frozenRows: 0,
            frozenCols: 0,
          }),
        } as any}
      >
        <ClientSideSuspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black/60 dark:border-white/20 dark:border-t-white/60" />
                <p className="text-xs text-black/40 dark:text-white/40">Loading spreadsheet...</p>
              </div>
            </div>
          }
        >
          <Spreadsheet />
        </ClientSideSuspense>
      </RoomProvider>
    </div>
  );
}
