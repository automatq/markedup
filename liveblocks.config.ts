declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar?: string;
        color: string;
      };
    };
    RoomEvent: {
      type: "REACTION";
      emoji: string;
      userId: string;
    };
  }
}

export {};
