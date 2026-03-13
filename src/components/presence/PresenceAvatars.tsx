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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function PresenceAvatars({ provider, currentUser }: PresenceAvatarsProps) {
  const [users, setUsers] = useState<PresenceUser[]>(
    currentUser ? [currentUser] : []
  );

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
            avatar: state.user.avatar,
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

  // Fall back to current user if no awareness data
  const displayUsers = users.length > 0 ? users : currentUser ? [currentUser] : [];
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
