import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../services/api";
import type { Employee } from "../types";

// ── Query keys — centralised so invalidation is consistent ───────────
export const QK = {
  ME: ["me"],
  ASSETS: ["assets"],
  ASSET: (id: number) => ["assets", id],
  ALLOCATIONS: ["allocations"],
  TRANSFERS: ["transfers"],
  BOOKINGS: ["bookings"],
  MAINTENANCE: ["maintenance"],
  AUDITS: ["audits"],
  AUDIT_VERIFICATIONS: (id: number) => ["audits", id, "verifications"],
  EMPLOYEES: ["employees"],
  DEPARTMENTS: ["departments"],
  NOTIFICATIONS: (userId: number) => ["notifications", userId],
  REMINDERS: (userId: number) => ["reminders", userId],
  DASHBOARD_STATS: ["dashboard", "stats"],
  ACTIVITY_FEED: ["dashboard", "activity"],
};

// ── Assets ────────────────────────────────────────────────────────────
export function useAssets(
  params?: Parameters<typeof api.fetchAssets>[0]
) {
  return useQuery({
    queryKey: [...QK.ASSETS, params],
    queryFn: () => api.fetchAssets(params),
    staleTime: 30_000,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.ASSETS });
      toast.success("Asset registered successfully");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create asset"),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof api.updateAsset>[1] }) =>
      api.updateAsset(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.ASSETS });
      toast.success("Asset updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update asset"),
  });
}

// ── Allocations ───────────────────────────────────────────────────────
export function useAllocations() {
  return useQuery({
    queryKey: QK.ALLOCATIONS,
    queryFn: () => api.fetchAllocations(),
    staleTime: 30_000,
  });
}

export function useAllocateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.allocateAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.ALLOCATIONS });
      qc.invalidateQueries({ queryKey: QK.ASSETS });
      toast.success("Asset allocated successfully");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to allocate asset"),
  });
}

export function useReturnAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ allocId, notes }: { allocId: number; notes?: string }) =>
      api.returnAsset(allocId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.ALLOCATIONS });
      qc.invalidateQueries({ queryKey: QK.ASSETS });
      toast.success("Asset returned to inventory");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to return asset"),
  });
}

// ── Transfers ─────────────────────────────────────────────────────────
export function useTransfers() {
  return useQuery({
    queryKey: QK.TRANSFERS,
    queryFn: api.fetchTransfers,
    staleTime: 20_000,
  });
}

export function useRequestTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      asset_id,
      target_dept_id,
      target_emp_id,
      requesterId,
    }: {
      asset_id: number;
      target_dept_id: number;
      target_emp_id: number;
      requesterId: number;
    }) => api.requestTransfer(asset_id, target_dept_id, target_emp_id, requesterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.TRANSFERS });
      toast.success("Transfer request submitted");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to request transfer"),
  });
}

export function useApproveTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      transferId,
      approved,
      notes,
      approverId,
      role,
    }: {
      transferId: number;
      approved: boolean;
      notes: string;
      approverId: number;
      role: string;
    }) => api.approveTransfer(transferId, approved, notes, approverId, role),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.TRANSFERS });
      qc.invalidateQueries({ queryKey: QK.ASSETS });
      toast.success(vars.approved ? "Transfer approved ✓" : "Transfer rejected");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to process transfer"),
  });
}

// ── Bookings ──────────────────────────────────────────────────────────
export function useBookings() {
  return useQuery({
    queryKey: QK.BOOKINGS,
    queryFn: api.fetchBookings,
    staleTime: 20_000,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      booking,
      userId,
    }: {
      booking: Parameters<typeof api.createBooking>[0];
      userId: number;
    }) => api.createBooking(booking, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.BOOKINGS });
      toast.success("Reservation confirmed");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create booking"),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, userId }: { bookingId: number; userId: number }) =>
      api.cancelBooking(bookingId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.BOOKINGS });
      toast.success("Booking cancelled");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to cancel booking"),
  });
}

// ── Maintenance ───────────────────────────────────────────────────────
export function useMaintenance() {
  return useQuery({
    queryKey: QK.MAINTENANCE,
    queryFn: api.fetchMaintenance,
    staleTime: 20_000,
  });
}

export function useReportMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      assetId,
      title,
      description,
      priority,
      reporterId,
    }: {
      assetId: number;
      title: string;
      description: string;
      priority: string;
      reporterId: number;
    }) => api.reportMaintenance(assetId, title, description, priority, reporterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.MAINTENANCE });
      qc.invalidateQueries({ queryKey: QK.ASSETS });
      toast.success("Fault ticket filed");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to report issue"),
  });
}

export function useUpdateMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      tech,
      notes,
      managerId,
    }: {
      id: number;
      status: string;
      tech: string;
      notes: string;
      managerId: number;
    }) => api.updateMaintenanceStatus(id, status, tech, notes, managerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.MAINTENANCE });
      qc.invalidateQueries({ queryKey: QK.ASSETS });
      toast.success("Ticket status updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update ticket"),
  });
}

// ── Audits ────────────────────────────────────────────────────────────
export function useAudits() {
  return useQuery({
    queryKey: QK.AUDITS,
    queryFn: api.fetchAudits,
    staleTime: 30_000,
  });
}

export function useAuditVerifications(cycleId: number | null) {
  return useQuery({
    queryKey: QK.AUDIT_VERIFICATIONS(cycleId ?? 0),
    queryFn: () => api.fetchAuditVerifications(cycleId!),
    enabled: cycleId !== null,
    staleTime: 10_000,
  });
}

export function useCreateAuditCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      deptScope,
      locScope,
      userId,
    }: {
      name: string;
      deptScope?: string;
      locScope?: string;
      userId?: number;
    }) => api.createAuditCycle(name, deptScope, locScope, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.AUDITS });
      toast.success("Audit cycle started");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create audit"),
  });
}

export function useVerifyAuditAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cycleId,
      assetId,
      verifiedStatus,
      notes,
      userId,
    }: {
      cycleId: number;
      assetId: number;
      verifiedStatus: "Verified" | "Missing" | "Damaged";
      notes?: string;
      userId?: number;
    }) => api.verifyAuditAsset(cycleId, assetId, verifiedStatus, notes, userId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.AUDIT_VERIFICATIONS(vars.cycleId) });
      qc.invalidateQueries({ queryKey: QK.ASSETS });
      toast.success("Asset verified");
    },
    onError: (err: Error) => toast.error(err.message ?? "Scan failed"),
  });
}

export function useCloseAuditCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cycleId,
      summary,
      userId,
    }: {
      cycleId: number;
      summary?: string;
      userId?: number;
    }) => api.closeAuditCycle(cycleId, summary, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.AUDITS });
      toast.success("Audit cycle closed");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to close audit"),
  });
}

// ── Employees & Departments ───────────────────────────────────────────
export function useEmployees() {
  return useQuery({
    queryKey: QK.EMPLOYEES,
    queryFn: api.fetchEmployees,
    staleTime: 60_000,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: QK.DEPARTMENTS,
    queryFn: api.fetchDepartments,
    staleTime: 60_000,
  });
}

export function usePromoteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.promoteEmployee(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.EMPLOYEES });
      toast.success("Role updated successfully");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update role"),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, managerId }: { name: string; managerId?: number }) =>
      api.createDepartment(name, managerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.DEPARTMENTS });
      toast.success("Department created");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create department"),
  });
}

// ── Notifications ─────────────────────────────────────────────────────
export function useNotifications(userId: number | undefined) {
  return useQuery({
    queryKey: QK.NOTIFICATIONS(userId ?? 0),
    queryFn: () => api.fetchNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 30_000, // poll every 30s
    staleTime: 10_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.markNotificationRead(id),
    onSuccess: () => {
      // optimistic — just invalidate all notification queries
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "notifications" });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => api.markAllNotificationsRead(userId),
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === "notifications" });
    },
  });
}

export function useReminders(userId: number | undefined) {
  return useQuery({
    queryKey: QK.REMINDERS(userId ?? 0),
    queryFn: () => api.fetchReminders(userId!),
    enabled: !!userId,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, userId }: { payload: { title: string; message: string; scheduled_for: string; priority: string }; userId: number }) =>
      api.createReminder(payload, userId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.REMINDERS(vars.userId) });
      toast.success("Reminder scheduled successfully");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to schedule reminder"),
  });
}

export function useCancelReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reminderId, userId }: { reminderId: number; userId: number }) =>
      api.cancelReminder(reminderId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.REMINDERS(vars.userId) });
      toast.success("Reminder cancelled");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to cancel reminder"),
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────
export function useDashboardStats() {
  return useQuery({
    queryKey: QK.DASHBOARD_STATS,
    queryFn: api.fetchDashboardStats,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useActivityFeed() {
  return useQuery({
    queryKey: QK.ACTIVITY_FEED,
    queryFn: api.fetchActivityFeed,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

// ── Auth ──────────────────────────────────────────────────────────────
export function useMe() {
  return useQuery({
    queryKey: QK.ME,
    queryFn: api.getMe,
    staleTime: Infinity,
    retry: false,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onError: (err: Error) => toast.error(err.message ?? "Login failed"),
  });
}

export function useSignup() {
  return useMutation({
    mutationFn: ({
      email,
      password,
      fullName,
    }: {
      email: string;
      password: string;
      fullName: string;
    }) => api.signup(email, password, fullName),
    onSuccess: () => toast.success("Account created — please log in"),
    onError: (err: Error) => toast.error(err.message ?? "Signup failed"),
  });
}

// ── Directory, Categories & Profile Settings Additions ───────────────
export const QK_CATEGORIES = ["asset-categories"];

export function useUpdateEmployeeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empId, status }: { empId: number; status: string }) =>
      api.updateEmployeeStatus(empId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.EMPLOYEES });
      toast.success("Employee status updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update employee status"),
  });
}

export function useAssignEmployeeDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ empId, deptId }: { empId: number; deptId?: number }) =>
      api.assignEmployeeDepartment(empId, deptId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.EMPLOYEES });
      toast.success("Department assigned successfully");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to assign department"),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deptId, name, parentId, managerId }: { deptId: number; name: string; parentId?: number; managerId?: number }) =>
      api.updateDepartment(deptId, name, parentId, managerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.DEPARTMENTS });
      toast.success("Department details updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update department"),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deptId: number) => api.deleteDepartment(deptId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.DEPARTMENTS });
      qc.invalidateQueries({ queryKey: QK.EMPLOYEES });
      toast.success("Department removed");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete department"),
  });
}

export function useAssetCategories() {
  return useQuery({
    queryKey: QK_CATEGORIES,
    queryFn: () => api.fetchAssetCategories(),
    staleTime: 60_000,
  });
}

export function useCreateAssetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      api.createAssetCategory(name, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_CATEGORIES });
      toast.success("Asset category registered");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create category"),
  });
}

export function useUpdateAssetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, description }: { id: number; name: string; description?: string }) =>
      api.updateAssetCategory(id, name, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_CATEGORIES });
      toast.success("Category details updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update category"),
  });
}

export function useDeleteAssetCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteAssetCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_CATEGORIES });
      toast.success("Category deleted");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete category"),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPw, newPw }: { currentPw: string; newPw: string }) =>
      api.changePassword(currentPw, newPw),
    onSuccess: () => toast.success("Password changed successfully ✓"),
    onError: (err: Error) => toast.error(err.message ?? "Failed to change password"),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fullName, profilePhoto }: { fullName?: string; profilePhoto?: string }) =>
      api.updateProfile(fullName, profilePhoto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.ME });
      qc.invalidateQueries({ queryKey: QK.EMPLOYEES });
      toast.success("Profile workspace updated");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update profile"),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.ASSETS });
      toast.success("Asset retired from service");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to retire asset"),
  });
}

export function useAssetHistory(assetId: number) {
  return useQuery({
    queryKey: ["assets", assetId, "history"],
    queryFn: () => api.fetchAssetHistory(assetId),
    enabled: !!assetId,
    staleTime: 10_000,
  });
}

export function useUploadFile() {
  return useMutation({
    mutationFn: (file: File) => api.uploadFile(file),
    onError: (err: Error) => toast.error(err.message ?? "Failed to upload attachment"),
  });
}

