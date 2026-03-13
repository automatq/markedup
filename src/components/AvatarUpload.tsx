"use client";

import React, { useCallback, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

interface AvatarUploadProps {
  currentImageUrl?: string;
  fallbackInitials: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  onUpload: (file: File) => void;
  onRemove?: () => void;
}

const sizeMap = {
  sm: { container: "h-12 w-12", text: "text-sm", icon: "h-3 w-3", badge: "h-5 w-5" },
  md: { container: "h-20 w-20", text: "text-xl", icon: "h-4 w-4", badge: "h-7 w-7" },
  lg: { container: "h-28 w-28", text: "text-3xl", icon: "h-5 w-5", badge: "h-9 w-9" },
};

export function AvatarUpload({
  currentImageUrl,
  fallbackInitials,
  color = "#6366f1",
  size = "md",
  onUpload,
  onRemove,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const s = sizeMap[size];
  const imageUrl = preview ?? currentImageUrl;

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      onUpload(file);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="relative inline-block group">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`${s.container} rounded-full flex items-center justify-center overflow-hidden border-2 transition-all cursor-pointer ${
          dragging
            ? "border-black dark:border-white scale-105"
            : "border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25"
        }`}
        style={!imageUrl ? { backgroundColor: color } : undefined}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className={`${s.text} font-semibold text-white`}>
            {fallbackInitials}
          </span>
        )}
      </button>

      {/* Camera badge */}
      <div
        onClick={() => inputRef.current?.click()}
        className={`absolute bottom-0 right-0 ${s.badge} rounded-full bg-black dark:bg-white flex items-center justify-center cursor-pointer border-2 border-white dark:border-black transition-transform hover:scale-110`}
      >
        <Camera className={`${s.icon} text-white dark:text-black`} />
      </div>

      {/* Remove button */}
      {imageUrl && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPreview(null);
            onRemove();
          }}
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-2.5 w-2.5 text-white" />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
