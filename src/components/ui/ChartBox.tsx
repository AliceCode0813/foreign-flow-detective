"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Recharts SSR/레이아웃 오류 방지용 컨테이너 */
export function ChartBox({
  heightClassName = "h-64",
  children,
}: {
  heightClassName?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("w-full min-w-0", heightClassName)}>
      {mounted ? children : null}
    </div>
  );
}
