"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isWatchlisted,
  toggleWatchlistCode,
  WATCHLIST_CHANGE_EVENT,
} from "@/lib/watchlist-client";

interface FavoriteButtonProps {
  code: string;
  size?: "sm" | "md";
  className?: string;
}

/** 즐겨찾기 토글 — 브라우저 localStorage */
export function FavoriteButton({ code, size = "md", className }: FavoriteButtonProps) {
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setActive(isWatchlisted(code));
    setMounted(true);
    const sync = () => setActive(isWatchlisted(code));
    window.addEventListener(WATCHLIST_CHANGE_EVENT, sync);
    return () => window.removeEventListener(WATCHLIST_CHANGE_EVENT, sync);
  }, [code]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActive(toggleWatchlistCode(code));
  }

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className={cn(
        "rounded-full p-1.5 transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/40",
        !mounted && "opacity-0",
        className,
      )}
    >
      <Star
        className={cn(
          iconSize,
          active
            ? "fill-amber-400 text-amber-400"
            : "text-slate-300 dark:text-slate-600",
        )}
      />
    </button>
  );
}
