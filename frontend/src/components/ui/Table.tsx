import React from "react";
import { cn } from "../../lib/utils";
import { Spinner } from "./Spinner";
import { EmptyState } from "./EmptyState";

export interface ColumnDef<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[] | undefined;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string | number;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "There is nothing to display yet.",
  emptyIcon,
  onRowClick,
  keyExtractor,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={5} cols={columns.length} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        className="py-16"
      />
    );
  }

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200/60 dark:border-slate-800/80">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-450 dark:text-slate-500",
                  col.headerClassName
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/70 dark:divide-slate-850/40">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "transition-all duration-150 ease-out",
                onRowClick
                  ? "cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                  : "hover:bg-slate-50/20 dark:hover:bg-slate-900/10"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-[13px] text-slate-600 dark:text-slate-350 align-middle",
                    col.className
                  )}
                >
                  {col.render
                    ? col.render(row)
                    : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Table skeleton ────────────────────────────────────────────────────
function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-0">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-slate-200/60 dark:border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-slate-200 dark:bg-slate-800 flex-1 animate-pulse" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3.5 border-b border-slate-100/60 dark:border-slate-800/50">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-4 rounded bg-slate-100 dark:bg-slate-800/70 flex-1 animate-pulse"
              style={{ animationDelay: `${(r * cols + c) * 40}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Also export Spinner here for convenience
export { Spinner };
