import React from "react";
import { cn } from "../../lib/utils";
import {
  ASSET_STATUS_COLORS,
  PRIORITY_COLORS,
  TRANSFER_STATUS_COLORS,
  MAINTENANCE_STATUS_COLORS,
  BOOKING_STATUS_COLORS,
  ROLE_COLORS,
  type RoleName,
} from "../../lib/constants";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "violet";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: "xs" | "sm";
}

const variantClasses: Record<BadgeVariant, string> = {
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  warning:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  neutral:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  violet:
    "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
};

/** Generic badge */
export function Badge({
  children,
  variant = "neutral",
  size = "sm",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-bold uppercase tracking-wide rounded-full",
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Auto-coloured badge for Asset.status values */
export function AssetStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full",
        ASSET_STATUS_COLORS[status] ?? variantClasses.neutral
      )}
    >
      {status}
    </span>
  );
}

/** Auto-coloured badge for maintenance priority */
export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded-full",
        PRIORITY_COLORS[priority] ?? variantClasses.neutral
      )}
    >
      {priority}
    </span>
  );
}

/** Auto-coloured badge for Transfer.status */
export function TransferStatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full",
        TRANSFER_STATUS_COLORS[status] ?? variantClasses.neutral
      )}
    >
      {label}
    </span>
  );
}

/** Auto-coloured badge for maintenance status */
export function MaintenanceStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full",
        MAINTENANCE_STATUS_COLORS[status] ?? variantClasses.neutral
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

/** Auto-coloured badge for Booking.status */
export function BookingStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full",
        BOOKING_STATUS_COLORS[status] ?? variantClasses.neutral
      )}
    >
      {status}
    </span>
  );
}

/** Auto-coloured badge for Employee.role */
export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full",
        ROLE_COLORS[role as RoleName] ?? variantClasses.neutral
      )}
    >
      {role.replace(/_/g, " ")}
    </span>
  );
}
