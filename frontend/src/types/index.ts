// Re-export every domain type from the API service as the single import source.
// Feature modules should `import type { Asset, Employee } from "@/types"` instead of
// importing directly from services/api.ts.

export type {
  Employee,
  Asset,
  AssetAllocation,
  TransferRequest,
  Booking,
  MaintenanceIssue,
  AuditCycle,
  AuditVerification,
  ActivityLog,
  AppNotification,
  Department,
  ScheduledReminder,
} from "../services/api";
