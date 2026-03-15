"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { LiveblocksProvider } from "@liveblocks/react/suspense";

interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
}

// Cache resolved users so we don't re-fetch constantly
const userCache = new Map<string, UserInfo>();

export function Providers({ children }: { children: React.ReactNode }) {
  // Load saved accessibility preferences
  useEffect(() => {
    const el = document.documentElement;
    const textIntensity = localStorage.getItem("textIntensity");
    if (textIntensity) el.style.setProperty("--text-intensity", textIntensity);

    const fontScale = localStorage.getItem("editorFontScale");
    if (fontScale) el.style.setProperty("--editor-font-scale", fontScale);

    const lineSpacing = localStorage.getItem("editorLineSpacing");
    if (lineSpacing) el.style.setProperty("--editor-line-spacing", lineSpacing);

    if (localStorage.getItem("reduceMotion") === "true") el.classList.add("reduce-motion");
    if (localStorage.getItem("dyslexiaFont") === "true") el.classList.add("dyslexia-font");
    if (localStorage.getItem("highContrast") === "true") el.classList.add("high-contrast");

    const uiFont = localStorage.getItem("uiFont");
    if (uiFont) {
      const fontMap: Record<string, string> = {
        "geist-sans": "var(--font-geist-sans, system-ui, sans-serif)",
        "geist-mono": "var(--font-geist-mono, 'Courier New', monospace)",
        "inter": "var(--font-inter, system-ui, sans-serif)",
        "dm-sans": "var(--font-dm-sans, system-ui, sans-serif)",
        "space-grotesk": "var(--font-space-grotesk, system-ui, sans-serif)",
        "jetbrains-mono": "var(--font-jetbrains-mono, 'Courier New', monospace)",
        "ibm-plex-sans": "var(--font-ibm-plex-sans, system-ui, sans-serif)",
        "ibm-plex-mono": "var(--font-ibm-plex-mono, 'Courier New', monospace)",
      };
      el.style.setProperty("--ui-font", fontMap[uiFont] || fontMap["geist-sans"]);
    }
  }, []);

  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={async ({ userIds }) => {
        // Check cache first
        const uncached = userIds.filter((id) => !userCache.has(id));

        if (uncached.length > 0) {
          try {
            const res = await fetch(
              `/api/users/search?${uncached.map((id) => `ids=${id}`).join("&")}`
            );
            if (res.ok) {
              const users: UserInfo[] = await res.json();
              for (const u of users) {
                userCache.set(u.id, u);
              }
            }
          } catch {
            // Fall through with defaults
          }
        }

        return userIds.map((id) => {
          const cached = userCache.get(id);
          return cached
            ? { name: cached.name, avatar: cached.avatar, color: cached.color ?? "#6366f1" }
            : { name: "Unknown user", color: "#6366f1" };
        });
      }}
      resolveMentionSuggestions={async ({ text }) => {
        // Fetch users matching the typed text after @
        try {
          const res = await fetch(
            `/api/users/search?query=${encodeURIComponent(text ?? "")}`
          );
          if (res.ok) {
            const users: UserInfo[] = await res.json();
            // Cache these while we have them
            for (const u of users) {
              userCache.set(u.id, u);
            }
            return users.map((u) => u.id);
          }
        } catch {
          // ignore
        }
        return [];
      }}
      resolveRoomsInfo={async ({ roomIds }) => {
        // Resolve document room IDs to titles for notifications
        // Room IDs are like "document:abc123"
        const docIds = roomIds
          .filter((id) => id.startsWith("document:"))
          .map((id) => id.replace("document:", ""));

        if (docIds.length === 0) {
          return roomIds.map(() => ({}));
        }

        try {
          const res = await fetch(
            `/api/documents?ids=${docIds.join(",")}`
          );
          if (res.ok) {
            const docs: { id: string; title: string }[] = await res.json();
            const docMap = new Map(docs.map((d) => [d.id, d]));

            return roomIds.map((roomId) => {
              const docId = roomId.replace("document:", "");
              const doc = docMap.get(docId);
              return doc ? { name: doc.title } : {};
            });
          }
        } catch {
          // ignore
        }
        return roomIds.map(() => ({}));
      }}
    >
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
      </ThemeProvider>
    </LiveblocksProvider>
  );
}
