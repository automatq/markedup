"use client";

import React from "react";
import { useOthers, useSelf } from "@liveblocks/react/suspense";

export interface PresenceUser {
  name: string;
  color: string;
  avatar?: string;
  isCurrentUser?: boolean;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Live presence avatars powered by Liveblocks.
 * Must be rendered inside a RoomProvider.
 */
export function PresenceAvatars() {
  const self = useSelf();
  const others = useOthers();

  const displayUsers: PresenceUser[] = [];

  // Add other users first
  for (const other of others) {
    if (other.info) {
      displayUsers.push({
        name: other.info.name,
        color: other.info.color,
        avatar: other.info.avatar,
        isCurrentUser: false,
      });
    }
  }

  // Add current user last
  if (self?.info) {
    displayUsers.push({
      name: self.info.name,
      color: self.info.color,
      avatar: self.info.avatar,
      isCurrentUser: true,
    });
  }

  const maxVisible = 5;
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

/**
 * Fallback presence component for use outside a RoomProvider.
 * Shows only the current user.
 */
export function PresenceAvatarsFallback({ currentUser }: { currentUser?: PresenceUser }) {
  if (!currentUser) return null;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        <div
          title={`${currentUser.name} (you)`}
          className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white dark:border-black text-[10px] font-semibold overflow-hidden"
          style={{
            backgroundColor: currentUser.avatar ? undefined : currentUser.color,
          }}
        >
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-white mix-blend-luminosity">
              {getInitials(currentUser.name)}
            </span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-black bg-emerald-500" />
        </div>
      </div>
    </div>
  );
}
