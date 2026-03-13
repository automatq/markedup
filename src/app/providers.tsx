"use client";

import { ThemeProvider } from "next-themes";
import { LiveblocksProvider } from "@liveblocks/react/suspense";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
      </ThemeProvider>
    </LiveblocksProvider>
  );
}
