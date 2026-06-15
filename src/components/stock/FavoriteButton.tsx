"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  code: string;
  initialActive: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** 즐겨찾기 토글 버튼 */
export function FavoriteButton({
  code,
  initialActive,
  size = "md",
  className,
}: FavoriteButtonProps) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    const next = !active;

    try {
      if (next) {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          alert(data.error ?? "즐겨찾기 추가 실패");
          return;
        }
      } else {
        await fetch(`/api/watchlist/${code}`, { method: "DELETE" });
      }
      setActive(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={active ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className={cn(
        "rounded-full p-1.5 transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/40",
        loading && "opacity-50",
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
