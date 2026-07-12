import { cn } from "../../lib/utils";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  xs: "w-3 h-3 border-[2px]",
  sm: "w-4 h-4 border-[2px]",
  md: "w-6 h-6 border-[2.5px]",
  lg: "w-10 h-10 border-[3px]",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "rounded-full border-slate-200 dark:border-slate-700 border-t-primary-500 animate-spin",
        sizes[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Full-page centered loading overlay */
export function PageSpinner() {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
      <div className="relative">
        <Spinner size="lg" />
        <div className="absolute inset-0 rounded-full bg-primary-500/10 blur-xl" />
      </div>
      <p className="text-sm text-slate-400 font-medium animate-pulse">
        Loading AssetFlow…
      </p>
    </div>
  );
}
