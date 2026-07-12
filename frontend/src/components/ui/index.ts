// Barrel export — import any UI primitive from "@/components/ui"
export { Button } from "./Button";
export type { } from "./Button"; // keeps module augmentation clean

export {
  Badge,
  AssetStatusBadge,
  PriorityBadge,
  TransferStatusBadge,
  MaintenanceStatusBadge,
  BookingStatusBadge,
  RoleBadge,
} from "./Badge";

export { Card } from "./Card";
export { Input, Select, Textarea } from "./Inputs";
export { Modal } from "./Modal";
export { Drawer } from "./Drawer";
export { DataTable } from "./Table";
export type { ColumnDef } from "./Table";
export { StatSkeleton, CardSkeleton, TableSkeleton, PageHeaderSkeleton } from "./Skeleton";
export { Spinner, PageSpinner } from "./Spinner";
export { EmptyState } from "./EmptyState";
export { Avatar } from "./Avatar";
export { Tooltip } from "./Tooltip";
export { ConfirmDialog } from "./ConfirmDialog";
