import React from "react";
import { cn } from "../../lib/utils";

// ── Generic shimmer skeleton ──────────────────────────────────────────
function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={cn(
        "animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800",
        className
      )}
    />
  );
}

// ── KPI / Stat card skeleton ──────────────────────────────────────────
export function StatSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-8 w-8 rounded-xl" />
      </div>
      <Shimmer className="h-8 w-20" />
      <Shimmer className="h-3 w-36" />
    </div>
  );
}

// ── Feature card skeleton ─────────────────────────────────────────────
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-1/3" />
        <Shimmer className="h-5 w-14 rounded-full" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          className="h-3"
          style={{ width: `${90 - i * 15}%` } as React.CSSProperties}
        />
      ))}
      <div className="flex gap-2 pt-2">
        <Shimmer className="h-7 w-20 rounded-xl" />
        <Shimmer className="h-7 w-20 rounded-xl" />
      </div>
    </div>
  );
}

// ── Table skeleton ────────────────────────────────────────────────────
export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="space-y-0">
      <div className="flex gap-4 px-4 py-3 border-b border-slate-200/60 dark:border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-4 px-4 py-3.5 border-b border-slate-100/60 dark:border-slate-800/40"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-4 rounded flex-1 bg-slate-100 dark:bg-slate-800/70 animate-pulse"
              style={{ animationDelay: `${(r * cols + c) * 40}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Page header skeleton ──────────────────────────────────────────────
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Shimmer className="h-6 w-48" />
        <Shimmer className="h-3 w-64" />
      </div>
      <Shimmer className="h-9 w-32 rounded-xl" />
    </div>
  );
}
