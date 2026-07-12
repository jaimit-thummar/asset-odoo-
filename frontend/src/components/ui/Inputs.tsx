import React from "react";
import { cn } from "../../lib/utils";

// ── Shared label/error wrappers ───────────────────────────────────────
function FieldWrapper({
  label,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label}
          {required && <span className="ml-0.5 text-red-400">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-[11px] text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}

const baseInput =
  "w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-550 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

// ── Input ─────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, wrapperClassName, required, className, ...props }, ref) => (
    <FieldWrapper
      label={label}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <input
        ref={ref}
        className={cn(baseInput, error && "border-red-400 focus:ring-red-400/50", className)}
        required={required}
        {...props}
      />
    </FieldWrapper>
  )
);
Input.displayName = "Input";

// ── Select ────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  placeholder?: string;
  options: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      wrapperClassName,
      required,
      className,
      placeholder,
      options,
      ...props
    },
    ref
  ) => (
    <FieldWrapper
      label={label}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <select
        ref={ref}
        className={cn(baseInput, error && "border-red-400 focus:ring-red-400/50", className)}
        required={required}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  )
);
Select.displayName = "Select";

// ── Textarea ──────────────────────────────────────────────────────────
interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ label, error, wrapperClassName, required, className, ...props }, ref) => (
  <FieldWrapper
    label={label}
    error={error}
    required={required}
    className={wrapperClassName}
  >
    <textarea
      ref={ref}
      rows={3}
      className={cn(
        baseInput,
        "resize-none",
        error && "border-red-400 focus:ring-red-400/50",
        className
      )}
      required={required}
      {...props}
    />
  </FieldWrapper>
));
Textarea.displayName = "Textarea";
