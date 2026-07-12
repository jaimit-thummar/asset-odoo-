import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  CalendarDays,
  Wrench,
  ClipboardCheck,
  Users,
  Settings,
  HelpCircle,
  Laptop,
  Car,
  Sofa,
  Monitor,
  Cpu,
  BarChart3,
  Bell,
  type LucideIcon,
} from "lucide-react";

// ── Role definitions ─────────────────────────────────────────────────
export const ROLES = {
  ADMIN: "admin",
  ASSET_MANAGER: "asset_manager",
  DEPARTMENT_HEAD: "department_head",
  EMPLOYEE: "employee",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<RoleName, string> = {
  admin: "Platform Admin",
  asset_manager: "Asset Manager",
  department_head: "Department Head",
  employee: "Employee",
};

export const ROLE_COLORS: Record<RoleName, string> = {
  admin:
    "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  asset_manager:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  department_head:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  employee:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

// ── Status colours ────────────────────────────────────────────────────
export const ASSET_STATUS_COLORS: Record<string, string> = {
  Available:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  Allocated:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  Maintenance:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  Disposed:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  Lost: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

export const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  Medium:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  High: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  Urgent: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

export const TRANSFER_STATUS_COLORS: Record<string, string> = {
  Pending_Dept_Head:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  Pending_Asset_Manager:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  Approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

export const MAINTENANCE_STATUS_COLORS: Record<string, string> = {
  Pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  Approved:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  In_Progress:
    "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  Resolved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  Reserved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  CheckedIn:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  Cancelled:
    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  Completed:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

// ── Asset category icons ─────────────────────────────────────────────
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Laptops: Laptop,
  Vehicles: Car,
  Furniture: Sofa,
  "Audio Visual": Monitor,
  Electronics: Cpu,
  default: Package,
};

export function getCategoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS["default"];
}

// ── Routes ───────────────────────────────────────────────────────────
export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/",
  ASSETS: "/assets",
  ALLOCATIONS: "/allocations",
  TRANSFERS: "/transfers",
  BOOKINGS: "/bookings",
  MAINTENANCE: "/maintenance",
  AUDITS: "/audits",
  REPORTS: "/reports",
  NOTIFICATIONS: "/notifications",
  ORGANIZATION: "/organization",
  SETTINGS: "/settings",
  PROFILE: "/profile",
  HELP: "/help",
} as const;

// ── Sidebar navigation items ─────────────────────────────────────────
export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: RoleName[];
  badge?: string;
}

export const SIDEBAR_NAV: NavItem[] = [
  {
    label: "Dashboard",
    path: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
    roles: ["admin", "asset_manager", "department_head", "employee"],
  },
  {
    label: "Assets",
    path: ROUTES.ASSETS,
    icon: Package,
    roles: ["admin", "asset_manager", "department_head", "employee"],
  },
  {
    label: "Allocations",
    path: ROUTES.ALLOCATIONS,
    icon: Cpu,
    roles: ["admin", "asset_manager", "department_head", "employee"],
  },
  {
    label: "Transfers",
    path: ROUTES.TRANSFERS,
    icon: ArrowLeftRight,
    roles: ["admin", "asset_manager", "department_head", "employee"],
  },
  {
    label: "Bookings",
    path: ROUTES.BOOKINGS,
    icon: CalendarDays,
    roles: ["admin", "asset_manager", "department_head", "employee"],
  },
  {
    label: "Maintenance",
    path: ROUTES.MAINTENANCE,
    icon: Wrench,
    roles: ["admin", "asset_manager", "department_head", "employee"],
  },
  {
    label: "Audits",
    path: ROUTES.AUDITS,
    icon: ClipboardCheck,
    roles: ["admin", "asset_manager"],
  },
  {
    label: "Reports",
    path: ROUTES.REPORTS,
    icon: BarChart3,
    roles: ["admin", "asset_manager", "department_head"],
  },
  {
    label: "Notifications",
    path: ROUTES.NOTIFICATIONS,
    icon: Bell,
    roles: ["admin", "asset_manager", "department_head", "employee"],
  },
  {
    label: "Organization",
    path: ROUTES.ORGANIZATION,
    icon: Users,
    roles: ["admin", "asset_manager", "department_head"],
  },
  {
    label: "Settings",
    path: ROUTES.SETTINGS,
    icon: Settings,
    roles: ["admin", "asset_manager", "department_head", "employee"],
  },
  {
    label: "Help",
    path: ROUTES.HELP,
    icon: HelpCircle,
    roles: ["admin", "asset_manager", "department_head", "employee"],
  },
];

// ── Asset categories & conditions ────────────────────────────────────
export const ASSET_CATEGORIES = [
  "Laptops",
  "Furniture",
  "Vehicles",
  "Audio Visual",
  "Electronics",
  "Office Equipment",
  "Networking",
  "Other",
];

export const ASSET_CONDITIONS = [
  "Excellent",
  "Good",
  "Fair",
  "Poor",
  "Broken",
];

export const ASSET_STATUSES = [
  "Available",
  "Allocated",
  "Maintenance",
  "Disposed",
  "Lost",
];
