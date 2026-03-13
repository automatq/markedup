"use client";

import React, { useEffect, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";

export interface PresenceUser {
  name: string;
  color: string;
  avatar?: string;
  isCurrentUser?: boolean;
}

interface PresenceAvatarsProps {
  provider?: HocuspocusProvider | null;
  currentUser?: PresenceUser;
}

// Mock users for demo — in production these come from provider.awareness
const MOCK_USERS: PresenceUser[] = [
  { name: "You", color: "#6366f1", isCurrentUser: true },
  { name: "Sarah K", color: "#ec4899" },
  { name: "James L", color: "#10b981" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PresenceAvatars({ provider, currentUser }: PresenceAvatarsProps) {
  const [users, setUsers] = useState<PresenceUser[]>(MOCK_USERS);

  useEffect(() => {
    if (!provider) return;

    const updateUsers = () => {
      const states = provider.awareness?.getStates();
      if (!states) return;

      const awarenessUsers: PresenceUser[] = [];
      states.forEach((state: any) => {
        if (state.user) {
          awarenessUsers.push({
            name: state.user.name ?? "Anonymous",
            color: state.user.color ?? "#6366f1",
            isCurrentUser: false,
          });
        }
      });

      if (awarenessUsers.length > 0) {
        setUsers(awarenessUsers);
      }
    };

    provider.awareness?.on("change", updateUsers);
    updateUsers();

    return () => {
      provider.awareness?.off("change", updateUsers);
    };
  }, [provider]);

  const maxVisible = 4;
  const visible = users.slice(0, maxVisible);
  const overflow = users.length - maxVisible;

  return (
    <div className="flex items-center">
      {/* Avatar stack */}
      <div className="flex -space-x-2">
        {visible.map((user, i) => (
          <div
            key={`${user.name}-${i}`}
            title={`${user.name}${user.isCurrentUser ? " (you)" : ""}`}
            className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white dark:border-black text-[10px] font-semibold transition-transform hover:scale-110 hover:z-10 cursor-default"
            style={{ backgroundColor: user.color, zIndex: visible.length - i }}
          >
            <span className="text-white mix-blend-luminosity">
              {getInitials(user.name)}
            </span>
            {/* Online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-black bg-emerald-500" />
          </div>
        ))}
        {overflow > 0 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white dark:border-black bg-black/10 dark:bg-white/10 text-[10px] font-medium text-black/60 dark:text-white/60">
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}
