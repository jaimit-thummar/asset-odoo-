import React from "react";
import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "ghost" | "danger" | "outline" | "success";
type Size = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  isIcon?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white border border-primary-600/40 shadow-[0_1.5px_3px_0_rgba(124,58,237,0.25)]",
  ghost:
    "bg-transparent hover:bg-slate-100/60 dark:hover:bg-slate-850/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
  danger:
    "bg-gradient-to-b from-red-500 to-red-650 hover:from-red-600 hover:to-red-700 text-white border border-red-650/40 shadow-[0_1.5px_3px_0_rgba(239,68,68,0.2)]",
  outline:
    "bg-white dark:bg-slate-900/50 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/40 text-slate-700 dark:text-slate-300 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]",
  success:
    "bg-gradient-to-b from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white border border-accent-600/45 shadow-[0_1.5px_3px_0_rgba(34,197,94,0.2)]",
};

const sizes: Record<Size, string> = {
  xs: "px-2.5 py-1 text-[11px] rounded-lg gap-1",
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-5 py-2.5 text-sm rounded-xl gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      isIcon = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none",
          variants[variant],
          sizes[size],
          isIcon && "aspect-square p-0 w-8 h-8",
          size === "sm" && isIcon && "w-7 h-7",
          size === "lg" && isIcon && "w-10 h-10",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          leftIcon
        )}
        {!isIcon && children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
