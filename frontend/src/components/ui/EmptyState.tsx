import React from "react";
import { cn } from "../../lib/utils";
import { PackageOpen } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = "Nothing here yet",
  description = "No records to display.",
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-14 text-center gap-3",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
        {icon ?? <PackageOpen className="w-6 h-6" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {title}
        </p>
        <p className="text-xs text-slate-400 max-w-xs">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
