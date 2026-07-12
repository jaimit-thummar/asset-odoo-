import React from "react";
import { cn } from "../../lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterItem {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

interface FilterBarProps {
  filters: FilterItem[];
  className?: string;
  onReset?: () => void;
  hasActiveFilters?: boolean;
}

export function FilterBar({
  filters,
  className,
  onReset,
  hasActiveFilters,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        className
      )}
    >
      {filters.map((f) => (
        <div key={f.key} className="flex flex-col min-w-[120px]">
          <select
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
            aria-label={f.label}
          >
            <option value="">{f.placeholder ?? `All ${f.label}`}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {hasActiveFilters && onReset && (
        <button
          onClick={onReset}
          className="text-xs font-semibold text-slate-400 hover:text-primary-500 transition-colors px-1"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
