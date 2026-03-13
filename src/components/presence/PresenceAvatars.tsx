"use client";

import React from "react";

export interface PresenceUser {
  name: string;
  color: string;
  avatar?: string;
  isCurrentUser?: boolean;
}

interface PresenceAvatarsProps {
  provider?: any;
  currentUser?: PresenceUser;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PresenceAvatars({ currentUser }: PresenceAvatarsProps) {
  // Liveblocks handles presence via its own UI — this shows the current user fallback
  const displayUsers: PresenceUser[] = currentUser ? [currentUser] : [];
  const maxVisible = 4;
  const visible = displayUsers.slice(0, maxVisible);
  const overflow = displayUsers.length - maxVisible;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((user, i) => (
          <div
            key={`${user.name}-${i}`}
            title={`${user.name}${user.isCurrentUser ? " (you)" : ""}`}
            className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white dark:border-black text-[10px] font-semibold transition-transform hover:scale-110 hover:z-10 cursor-default overflow-hidden"
            style={{
              backgroundColor: user.avatar ? undefined : user.color,
              zIndex: visible.length - i,
            }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-white mix-blend-luminosity">
                {getInitials(user.name)}
              </span>
            )}
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
