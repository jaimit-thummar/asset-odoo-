// API Client with automatic local storage fallback for demonstration robustness
import { supabase, supabaseActive } from "./supabase";

const API_BASE = "http://localhost:8000/api";

type RoleName = "admin" | "asset_manager" | "department_head" | "employee";

export interface Employee {
  id: number;
  email: string;
  full_name: string;
  role: RoleName;
  status: string;
  profile_photo?: string;
  department_id?: number;
  created_at: string;
}

export interface Asset {
  id: number;
  asset_tag: string;
  serial_number?: string;
  name: string;
  description?: string;
  category: string;
  purchase_date?: string;
  purchase_cost: number;
  warranty_expiration?: string;
  condition: string;
  location?: string;
  status: "Available" | "Allocated" | "Maintenance" | "Disposed" | "Lost";
  bookable: boolean;
  department_id?: number;
  qr_code_url?: string;
  image_url?: string;
  document_url?: string;
  created_at: string;
}

export interface AssetAllocation {
  id: number;
  asset_id: number;
  employee_id?: number;
  department_id?: number;
  allocated_by_id?: number;
  allocated_at: string;
  expected_return_date?: string;
  returned_at?: string;
  notes?: string;
  status: "active" | "returned";
}

export interface TransferRequest {
  id: number;
  asset_id: number;
  requested_by_id: number;
  target_department_id: number;
  target_employee_id: number;
  dept_head_approved?: boolean;
  dept_head_approver_id?: number;
  dept_head_notes?: string;
  asset_manager_approved?: boolean;
  asset_manager_approver_id?: number;
  asset_manager_notes?: string;
  status: "Pending_Dept_Head" | "Pending_Asset_Manager" | "Approved" | "Rejected";
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  resource_name: string;
  resource_type: string;
  booked_by_id: number;
  start_time: string;
  end_time: string;
  purpose?: string;
  status: "Reserved" | "CheckedIn" | "Cancelled" | "Completed";
  created_at: string;
}

export interface MaintenanceIssue {
  id: number;
  asset_id: number;
  reported_by_id: number;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Pending" | "Approved" | "In_Progress" | "Resolved" | "Rejected";
  technician_assigned?: string;
  resolution_notes?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditCycle {
  id: number;
  name: string;
  created_by_id: number;
  assigned_auditor_id?: number;
  department_scope?: string;
  location_scope?: string;
  status: "Active" | "Closed";
  created_at: string;
  closed_at?: string;
  report_summary?: string; // JSON String
}

export interface AuditVerification {
  id: number;
  audit_cycle_id: number;
  asset_id: number;
  scanned_by_id: number;
  verified_status: "Verified" | "Missing" | "Damaged";
  scanned_at: string;
  notes?: string;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  target_type: string;
  target_id?: number;
  details?: string;
  timestamp: string;
}

export interface AppNotification {
  id: number;
  employee_id: number;
  title: string;
  message: string;
  read: boolean;
  type: "info" | "success" | "warning" | "danger";
  created_at: string;
}

export interface ScheduledReminder {
  id: number;
  employee_id: number;
  title: string;
  message: string;
  scheduled_for: string;
  priority: "info" | "success" | "warning" | "danger";
  executed: boolean;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  organization_id: number;
  parent_id?: number;
  manager_id?: number;
}

// Initial Simulated Data when Backend is Offline
const INITIAL_DEPARTMENTS: Department[] = [
  { id: 1, name: "Engineering & IT", organization_id: 1 },
  { id: 2, name: "Marketing & Design", organization_id: 1, manager_id: 3 },
  { id: 3, name: "Operations & Legal", organization_id: 1 }
];

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, email: "admin@assetflow.com", full_name: "Sarah Jenkins", role: "admin", status: "active", department_id: 1, created_at: new Date().toISOString(), profile_photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" },
  { id: 2, email: "manager@assetflow.com", full_name: "Marcus Vance", role: "asset_manager", status: "active", department_id: 1, created_at: new Date().toISOString(), profile_photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150" },
  { id: 3, email: "head@assetflow.com", full_name: "Elena Rostova", role: "department_head", status: "active", department_id: 2, created_at: new Date().toISOString(), profile_photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150" },
  { id: 4, email: "employee@assetflow.com", full_name: "David Chen", role: "employee", status: "active", department_id: 1, created_at: new Date().toISOString(), profile_photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" }
];

const INITIAL_ASSETS: Asset[] = [
  { id: 1, asset_tag: "AST-1001", name: "MacBook Pro 16\" M3 Max", category: "Laptops", purchase_cost: 3499, status: "Allocated", bookable: false, department_id: 1, condition: "Excellent", serial_number: "C02X87GBJG5H", location: "HQ - Floor 3", qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AST-1001", created_at: new Date().toISOString() },
  { id: 2, asset_tag: "AST-1002", name: "iPad Pro 12.9\" M2", category: "Laptops", purchase_cost: 1199, status: "Available", bookable: false, department_id: 2, condition: "Good", serial_number: "C02Y789ABJ21", location: "HQ - Floor 2", qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AST-1002", created_at: new Date().toISOString() },
  { id: 3, asset_tag: "AST-1003", name: "Sony 4K Laser Projector", category: "Audio Visual", purchase_cost: 2499, status: "Available", bookable: true, department_id: 2, condition: "Excellent", serial_number: "SN-SONY-PROJ839", location: "HQ - Room 4B", qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AST-1003", created_at: new Date().toISOString() },
  { id: 4, asset_tag: "AST-1004", name: "Herman Miller Aeron Chair", category: "Furniture", purchase_cost: 1495, status: "Allocated", bookable: false, department_id: 1, condition: "Good", serial_number: "HM-AERON-7298", location: "HQ - Floor 3", qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AST-1004", created_at: new Date().toISOString() },
  { id: 5, asset_tag: "AST-1005", name: "Tesla Model 3 Corporate Car", category: "Vehicles", purchase_cost: 45990, status: "Maintenance", bookable: true, department_id: 3, condition: "Good", serial_number: "5YJ3E1EBXLF12", location: "HQ - Garage 2", qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AST-1005", created_at: new Date().toISOString() }
];

const INITIAL_ALLOCATIONS: AssetAllocation[] = [
  { id: 1, asset_id: 1, employee_id: 4, allocated_by_id: 2, status: "active", allocated_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), expected_return_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(), notes: "Setup for development work." }
];

const INITIAL_BOOKINGS: Booking[] = [
  { id: 1, resource_name: "Boardroom Crimson", resource_type: "Room", booked_by_id: 4, start_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), end_time: new Date(Date.now() + 4 * 3600 * 1000).toISOString(), purpose: "Engineering Sync", status: "Reserved", created_at: new Date().toISOString() }
];

const INITIAL_MAINTENANCE: MaintenanceIssue[] = [
  { id: 1, asset_id: 5, reported_by_id: 4, title: "Left Headlight Flicker", description: "Intermittent LED flicker when driving.", priority: "Medium", status: "Pending", created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), updated_at: new Date().toISOString() }
];

const INITIAL_AUDITS: AuditCycle[] = [
  { id: 1, name: "Q3 HQ Technology Audit", created_by_id: 1, department_scope: "Engineering & IT, Marketing & Design", location_scope: "HQ", status: "Active", created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() }
];

const INITIAL_VERIFICATIONS: AuditVerification[] = [
  { id: 1, audit_cycle_id: 1, asset_id: 1, scanned_by_id: 2, verified_status: "Verified", scanned_at: new Date().toISOString(), notes: "Verified in developer cubicle A4" }
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: 1, employee_id: 4, title: "Asset Allocated", message: "You have been assigned MacBook Pro AST-1001", read: false, type: "success", created_at: new Date().toISOString() }
];

class SimulatedBackend {
  private getStorage<T>(key: string, initial: T): T {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(val);
  }

  private setStorage<T>(key: string, data: T) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  getOrgs() { return [{ id: 1, name: "AssetFlow Global Corp" }]; }
  
  getDepts() { return this.getStorage("af_departments", INITIAL_DEPARTMENTS); }
  createDept(name: string, manager_id?: number) {
    const depts = this.getDepts();
    const newDept: Department = { id: Date.now(), name, organization_id: 1, manager_id };
    depts.push(newDept);
    this.setStorage("af_departments", depts);
    this.logActivity(0, "System", "department_created", "Department", newDept.id, `Created department ${name}`);
    return newDept;
  }

  getEmployees() { return this.getStorage("af_employees", INITIAL_EMPLOYEES); }
  promoteEmployee(id: number, role: RoleName) {
    const emps = this.getEmployees();
    const emp = emps.find(e => e.id === id);
    if (emp) {
      emp.role = role;
      this.setStorage("af_employees", emps);
      this.logActivity(0, "System", "role_promoted", "Employee", id, `Promoted employee to ${role}`);
      this.sendNotification(id, "Role Upgraded", `You have been promoted to ${role}`, "success");
      return emp;
    }
    throw new Error("Employee not found");
  }

  getAssets() { return this.getStorage("af_assets", INITIAL_ASSETS); }
  createAsset(asset: Omit<Asset, "id" | "asset_tag" | "status" | "qr_code_url" | "created_at">) {
    const assets = this.getAssets();
    const id = Date.now();
    const asset_tag = `AST-${1000 + assets.length + 1}`;
    const newAsset: Asset = {
      ...asset,
      id,
      asset_tag,
      status: "Available",
      qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${asset_tag}`,
      created_at: new Date().toISOString()
    };
    assets.push(newAsset);
    this.setStorage("af_assets", assets);
    this.logActivity(0, "System", "asset_created", "Asset", id, `Created asset ${asset.name}`);
    return newAsset;
  }

  updateAsset(id: number, payload: Partial<Asset>) {
    const assets = this.getAssets();
    const asset = assets.find(a => a.id === id);
    if (asset) {
      Object.assign(asset, payload);
      this.setStorage("af_assets", assets);
      return asset;
    }
    throw new Error("Asset not found");
  }

  getAllocations() { return this.getStorage("af_allocations", INITIAL_ALLOCATIONS); }
  allocateAsset(data: { asset_id: number; employee_id?: number; department_id?: number; expected_return_date?: string; notes?: string }) {
    const assets = this.getAssets();
    const asset = assets.find(a => a.id === data.asset_id);
    if (!asset || asset.status !== "Available") {
      throw new Error("Asset is unavailable for allocation");
    }

    asset.status = "Allocated";
    if (data.department_id) {
      asset.department_id = data.department_id;
    } else if (data.employee_id) {
      const emp = this.getEmployees().find(e => e.id === data.employee_id);
      if (emp && emp.department_id) {
        asset.department_id = emp.department_id;
      }
    }
    this.setStorage("af_assets", assets);

    const allocs = this.getAllocations();
    const id = Date.now();
    const newAlloc: any = {
      id,
      asset_id: data.asset_id,
      employee_id: data.employee_id,
      department_id: data.department_id,
      allocated_by_id: 2,
      allocated_at: new Date().toISOString(),
      expected_return_date: data.expected_return_date,
      status: "active",
      notes: data.notes
    };
    allocs.push(newAlloc);
    this.setStorage("af_allocations", allocs);

    if (data.employee_id) {
      const emp = this.getEmployees().find(e => e.id === data.employee_id);
      this.logActivity(2, "Marcus Vance", "asset_allocated", "Asset", data.asset_id, `Allocated ${asset.name} to ${emp ? emp.full_name : 'unknown'}`);
      this.sendNotification(data.employee_id, "Asset Allocated", `You have been allocated: ${asset.name}`, "success");
    } else if (data.department_id) {
      const dept = this.getDepts().find(d => d.id === data.department_id);
      this.logActivity(2, "Marcus Vance", "asset_allocated", "Asset", data.asset_id, `Allocated ${asset.name} to Department: ${dept ? dept.name : 'unknown'}`);
      if (dept && dept.manager_id) {
        this.sendNotification(dept.manager_id, "Department Asset Allocated", `Asset ${asset.name} allocated to department ${dept.name}`, "success");
      }
    }
    return newAlloc;
  }

  returnAsset(allocId: number, notes?: string) {
    const allocs = this.getAllocations();
    const alloc = allocs.find(a => a.id === allocId && a.status === "active");
    if (!alloc) throw new Error("Active allocation not found");

    alloc.status = "returned";
    alloc.returned_at = new Date().toISOString();
    alloc.notes = notes || alloc.notes;
    this.setStorage("af_allocations", allocs);

    const assets = this.getAssets();
    const asset = assets.find(a => a.id === alloc.asset_id);
    if (asset) {
      asset.status = "Available";
      this.setStorage("af_assets", assets);
      this.logActivity(2, "Marcus Vance", "asset_returned", "Asset", asset.id, `Returned ${asset.name}`);
    }

    if (alloc.employee_id) {
      this.sendNotification(alloc.employee_id, "Asset Returned", "Asset has been checked in successfully", "info");
    } else if (alloc.department_id) {
      const dept = this.getDepts().find(d => d.id === alloc.department_id);
      if (dept && dept.manager_id) {
        this.sendNotification(dept.manager_id, "Department Asset Returned", `Asset checked out to department '${dept.name}' has been returned`, "info");
      }
    }
    return alloc;
  }

  getTransfers(): TransferRequest[] { return this.getStorage("af_transfers", []); }
  requestTransfer(payload: { asset_id: number; target_department_id: number; target_employee_id: number }, requesterId: number) {
    const transfers = this.getTransfers();
    const assets = this.getAssets();
    const asset = assets.find(a => a.id === payload.asset_id);
    if (!asset || asset.status !== "Allocated") {
      throw new Error("Asset must be allocated to file transfer");
    }

    const newTransfer: TransferRequest = {
      id: Date.now(),
      asset_id: payload.asset_id,
      requested_by_id: requesterId,
      target_department_id: payload.target_department_id,
      target_employee_id: payload.target_employee_id,
      status: "Pending_Dept_Head",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    transfers.push(newTransfer);
    this.setStorage("af_transfers", transfers);
    this.logActivity(requesterId, "Staff", "transfer_requested", "Asset", payload.asset_id, "Filed department transfer request");
    
    // Notify department manager
    const depts = this.getDepts();
    const requester = this.getEmployees().find(e => e.id === requesterId);
    const dept = depts.find(d => d.id === requester?.department_id);
    if (dept && dept.manager_id) {
      this.sendNotification(dept.manager_id, "Transfer Pending Approval", "An asset transfer in your department is waiting review.", "warning");
    }
    
    return newTransfer;
  }

  approvalTransfer(id: number, approved: boolean, notes: string, approverId: number, role: string) {
    const transfers = this.getTransfers();
    const transfer = transfers.find(t => t.id === id);
    if (!transfer) throw new Error("Transfer not found");

    if (transfer.status === "Pending_Dept_Head") {
      transfer.dept_head_approved = approved;
      transfer.dept_head_approver_id = approverId;
      transfer.dept_head_notes = notes;
      if (approved) {
        transfer.status = "Pending_Asset_Manager";
        // Notify Asset Managers
        const managers = this.getEmployees().filter(e => e.role === "asset_manager");
        managers.forEach(m => {
          this.sendNotification(m.id, "Transfer Sign-off Required", "A department head has approved an asset transfer.", "warning");
        });
      } else {
        transfer.status = "Rejected";
        this.sendNotification(transfer.requested_by_id, "Transfer Request Rejected", `Dept Head rejected transfer: ${notes}`, "danger");
      }
    } else if (transfer.status === "Pending_Asset_Manager") {
      transfer.asset_manager_approved = approved;
      transfer.asset_manager_approver_id = approverId;
      transfer.asset_manager_notes = notes;
      if (approved) {
        transfer.status = "Approved";

        // Swap owners
        const assets = this.getAssets();
        const asset = assets.find(a => a.id === transfer.asset_id);
        if (asset) {
          asset.department_id = transfer.target_department_id;
          this.setStorage("af_assets", assets);

          // Return previous allocation
          const allocs = this.getAllocations();
          const oldAlloc = allocs.find(a => a.asset_id === asset.id && a.status === "active");
          if (oldAlloc) {
            oldAlloc.status = "returned";
            oldAlloc.returned_at = new Date().toISOString();
          }

          // Create new allocation
          allocs.push({
            id: Date.now() + 1,
            asset_id: asset.id,
            employee_id: transfer.target_employee_id,
            allocated_by_id: approverId,
            allocated_at: new Date().toISOString(),
            status: "active",
            notes: "Transfer complete allocation."
          });
          this.setStorage("af_allocations", allocs);
        }

        this.sendNotification(transfer.requested_by_id, "Transfer Complete", "Asset has been successfully transferred", "success");
        this.sendNotification(transfer.target_employee_id, "Asset Transferred to You", "You have custody of a new asset from transfer.", "success");
        this.logActivity(approverId, "Manager", "transfer_approved", "Asset", transfer.asset_id, "Approved transfer request");
      } else {
        transfer.status = "Rejected";
        this.sendNotification(transfer.requested_by_id, "Transfer Request Rejected", `Asset Manager rejected: ${notes}`, "danger");
      }
    }
    
    transfer.updated_at = new Date().toISOString();
    this.setStorage("af_transfers", transfers);
    return transfer;
  }

  getBookings() { return this.getStorage("af_bookings", INITIAL_BOOKINGS); }
  createBooking(payload: Omit<Booking, "id" | "status" | "created_at">, userId: number) {
    const bookings = this.getBookings();

    // Check double booking rules
    const start = new Date(payload.start_time).getTime();
    const end = new Date(payload.end_time).getTime();
    const overlap = bookings.find(b => {
      if (b.resource_name !== payload.resource_name || b.status !== "Reserved") return false;
      const bStart = new Date(b.start_time).getTime();
      const bEnd = new Date(b.end_time).getTime();
      return start < bEnd && end > bStart;
    });

    if (overlap) {
      throw new Error(`Conflict! ${payload.resource_name} is already booked from ${new Date(overlap.start_time).toLocaleTimeString()} to ${new Date(overlap.end_time).toLocaleTimeString()}`);
    }

    const newBooking: Booking = {
      ...payload,
      id: Date.now(),
      booked_by_id: userId,
      status: "Reserved",
      created_at: new Date().toISOString()
    };
    bookings.push(newBooking);
    this.setStorage("af_bookings", bookings);
    this.logActivity(userId, "Staff", "resource_booked", "Booking", newBooking.id, `Reserved ${payload.resource_name}`);
    this.sendNotification(userId, "Booking Confirmed", `Your booking for ${payload.resource_name} is scheduled`, "success");
    return newBooking;
  }

  cancelBooking(id: number, userId: number) {
    const bookings = this.getBookings();
    const booking = bookings.find(b => b.id === id);
    if (!booking) throw new Error("Booking not found");

    booking.status = "Cancelled";
    this.setStorage("af_bookings", bookings);
    this.sendNotification(booking.booked_by_id, "Booking Cancelled", `Booking for ${booking.resource_name} cancelled`, "info");
    this.logActivity(userId, "Staff", "booking_cancelled", "Booking", id, `Cancelled booking of ${booking.resource_name}`);
    return booking;
  }

  updateBooking(id: number, payload: Partial<Booking>, userId: number) {
    const bookings = this.getBookings();
    const booking = bookings.find(b => b.id === id);
    if (!booking) throw new Error("Booking not found");

    if (booking.booked_by_id !== userId) {
      const employees = this.getEmployees();
      const user = employees.find(e => e.id === userId);
      if (!user || user.role !== "admin") {
        throw new Error("Not authorized to modify this booking");
      }
    }

    const start_time = payload.start_time || booking.start_time;
    const end_time = payload.end_time || booking.end_time;
    const start = new Date(start_time).getTime();
    const end = new Date(end_time).getTime();

    if (start >= end) {
      throw new Error("End time must be after start time");
    }

    const overlap = bookings.find(b => {
      if (b.id === id || b.resource_name !== booking.resource_name || b.status !== "Reserved") return false;
      const bStart = new Date(b.start_time).getTime();
      const bEnd = new Date(b.end_time).getTime();
      return start < bEnd && end > bStart;
    });

    if (overlap) {
      throw new Error(`Conflict! Already booked from ${new Date(overlap.start_time).toLocaleTimeString()} to ${new Date(overlap.end_time).toLocaleTimeString()}`);
    }

    if (payload.start_time) booking.start_time = payload.start_time;
    if (payload.end_time) booking.end_time = payload.end_time;
    if (payload.purpose !== undefined) booking.purpose = payload.purpose;
    if (payload.status) booking.status = payload.status as any;

    this.setStorage("af_bookings", bookings);
    this.sendNotification(booking.booked_by_id, "Booking Updated", `Booking for ${booking.resource_name} was rescheduled/updated`, "info");
    this.logActivity(userId, "Staff", "resource_booking_updated", "Booking", id, `Updated booking of ${booking.resource_name}`);
    return booking;
  }

  getMaintenance() { return this.getStorage("af_maintenance", INITIAL_MAINTENANCE); }
  reportMaintenance(assetId: number, title: string, description: string, priority: any, reporterId: number, photoUrl?: string) {
    const maintList = this.getMaintenance();
    const id = Date.now();
    const newIssue: MaintenanceIssue = {
      id,
      asset_id: assetId,
      reported_by_id: reporterId,
      title,
      description,
      priority,
      status: "Pending",
      photo_url: photoUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    maintList.push(newIssue);
    this.setStorage("af_maintenance", maintList);

    // Update asset condition
    const assets = this.getAssets();
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      asset.status = "Maintenance";
      this.setStorage("af_assets", assets);
    }

    this.logActivity(reporterId, "Staff", "maintenance_reported", "MaintenanceIssue", id, `Reported issue on ${asset?.name || 'Asset'}`);
    
    // Notify managers
    const managers = this.getEmployees().filter(e => e.role === "asset_manager");
    managers.forEach(m => {
      this.sendNotification(m.id, "New Fault Ticket", `Broken asset reported: ${title}`, "danger");
    });

    return newIssue;
  }

  updateMaintenance(id: number, status: any, tech: string, notes: string, managerId: number) {
    const maintList = this.getMaintenance();
    const issue = maintList.find(m => m.id === id);
    if (!issue) throw new Error("Ticket not found");

    issue.status = status;
    if (tech) issue.technician_assigned = tech;
    if (notes) issue.resolution_notes = notes;
    issue.updated_at = new Date().toISOString();
    this.setStorage("af_maintenance", maintList);

    // Update asset status if resolved
    if (status === "Resolved" || status === "Rejected") {
      const assets = this.getAssets();
      const asset = assets.find(a => a.id === issue.asset_id);
      if (asset) {
        // Search if active allocation exists
        const activeAlloc = this.getAllocations().find(a => a.asset_id === asset.id && a.status === "active");
        asset.status = activeAlloc ? "Allocated" : "Available";
        this.setStorage("af_assets", assets);
      }
    }

    this.sendNotification(issue.reported_by_id, "Maintenance Update", `Your ticket status: ${status}`, status === "Resolved" ? "success" : "info");
    this.logActivity(managerId, "Manager", "maintenance_updated", "MaintenanceIssue", id, `Ticket marked ${status}`);
    return issue;
  }

  getAudits() { return this.getStorage("af_audits", INITIAL_AUDITS); }
  getVerifications() { return this.getStorage("af_verifications", INITIAL_VERIFICATIONS); }
  createAuditCycle(name: string, deptScope?: string, locScope?: string, userId?: number, assignedAuditorId?: number) {
    const audits = this.getAudits();
    const newAudit: AuditCycle = {
      id: Date.now(),
      name,
      created_by_id: userId || 1,
      assigned_auditor_id: assignedAuditorId,
      department_scope: deptScope || "All",
      location_scope: locScope || "All",
      status: "Active",
      created_at: new Date().toISOString()
    };
    audits.push(newAudit);
    this.setStorage("af_audits", audits);
    this.logActivity(userId || 1, "Admin", "audit_cycle_created", "AuditCycle", newAudit.id, `Started audit: ${name}`);
    if (assignedAuditorId) {
      this.sendNotification(assignedAuditorId, "Assigned to Audit Cycle", `You have been assigned as the auditor for '${name}'.`, "info");
    }
    return newAudit;
  }

  verifyAuditAsset(cycleId: number, assetId: number, verifiedStatus: "Verified" | "Missing" | "Damaged", notes?: string, userId?: number) {
    const verifications = this.getVerifications();
    const id = Date.now();
    const newVerify: AuditVerification = {
      id,
      audit_cycle_id: cycleId,
      asset_id: assetId,
      scanned_by_id: userId || 2,
      verified_status: verifiedStatus,
      scanned_at: new Date().toISOString(),
      notes
    };
    verifications.push(newVerify);
    this.setStorage("af_verifications", verifications);

    const assets = this.getAssets();
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      if (verifiedStatus === "Damaged") {
        asset.condition = "Poor";
        asset.status = "Maintenance";
      } else if (verifiedStatus === "Missing") {
        asset.status = "Lost";
      }
      this.setStorage("af_assets", assets);
      this.logActivity(userId || 2, "Manager", "audit_asset_scanned", "AuditVerification", id, `Asset ${asset.asset_tag} scanned as ${verifiedStatus}`);
    }

    return newVerify;
  }

  closeAuditCycle(cycleId: number, summary?: string, userId?: number) {
    const audits = this.getAudits();
    const audit = audits.find(a => a.id === cycleId);
    if (!audit || audit.status !== "Active") throw new Error("Active audit not found");

    const verifications = this.getVerifications().filter(v => v.audit_cycle_id === cycleId);
    const summary_obj = {
      closed_by: "System UI Mode",
      scanned_assets: verifications.length,
      missing_assets: verifications.filter(v => v.verified_status === "Missing").length,
      damaged_assets: verifications.filter(v => v.verified_status === "Damaged").length,
      notes: summary || "Direct UI close."
    };

    audit.status = "Closed";
    audit.closed_at = new Date().toISOString();
    audit.report_summary = JSON.stringify(summary_obj);
    this.setStorage("af_audits", audits);
    this.logActivity(userId || 1, "Admin", "audit_cycle_closed", "AuditCycle", cycleId, "Closed audit cycle");
    return audit;
  }

  getNotifications(userId: number) {
    const notifs = this.getStorage("af_notifications", INITIAL_NOTIFICATIONS);
    return notifs.filter(n => n.employee_id === userId);
  }

  markNotificationRead(id: number) {
    const notifs = this.getStorage("af_notifications", INITIAL_NOTIFICATIONS);
    const notif = notifs.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.setStorage("af_notifications", notifs);
    }
  }

  markAllNotificationsRead(userId: number) {
    const notifs = this.getStorage<any[]>("af_notifications", INITIAL_NOTIFICATIONS);
    notifs.filter((n: any) => n.employee_id === userId).forEach((n: any) => { n.read = true; });
    this.setStorage("af_notifications", notifs);
  }

  getReminders(userId: number) {
    const reminders = this.getStorage<any[]>("af_reminders", []);
    return reminders.filter((r: any) => r.employee_id === userId && !r.executed);
  }

  createReminder(payload: { title: string; message: string; scheduled_for: string; priority: string }, userId: number) {
    const reminders = this.getStorage<any[]>("af_reminders", []);
    const newReminder = {
      id: Date.now(),
      employee_id: userId,
      title: payload.title,
      message: payload.message,
      scheduled_for: payload.scheduled_for,
      priority: payload.priority,
      executed: false,
      created_at: new Date().toISOString()
    };
    reminders.push(newReminder);
    this.setStorage("af_reminders", reminders);
    return newReminder;
  }

  cancelReminder(reminderId: number) {
    const reminders = this.getStorage<any[]>("af_reminders", []);
    this.setStorage("af_reminders", reminders.filter((r: any) => r.id !== reminderId));
    return { status: "success" };
  }


  deleteAsset(id: number) {
    let assets = this.getAssets();
    const target = assets.find(a => a.id === id);
    assets = assets.filter(a => a.id !== id);
    this.setStorage("af_assets", assets);
    if (target) {
      this.logActivity(1, "Mock Admin", "asset_deleted", "Asset", id, `Asset deleted: ${target.name} (${target.asset_tag})`);
    }
    return { status: "success", message: "Asset retired successfully" };
  }

  getAssetHistory(id: number) {
    const activities = this.getStorage<any[]>("af_activities", []);
    // Filter activities where target matches
    return activities.filter(act => act.target_type === "Asset" && act.target_id === id);
  }

  getDashboardStats() {
    const assets = this.getAssets();
    const bookings = this.getBookings();
    const maintenance = this.getMaintenance();
    const audits = this.getAudits();
    const transfers = this.getTransfers();

    const avail = assets.filter(a => a.status === "Available").length;
    const allocated = assets.filter(a => a.status === "Allocated").length;
    const maint_today = maintenance.filter(m => ["Pending", "Approved", "In_Progress"].includes(m.status)).length;
    
    const upcoming_returns = this.getAllocations().filter(al => {
      if (al.status !== "active" || !al.expected_return_date) return false;
      const expected = new Date(al.expected_return_date).getTime();
      const inOneWeek = Date.now() + 7 * 24 * 3600 * 1000;
      return expected <= inOneWeek;
    }).length;

    const pending_allocations = transfers.filter(t => ["Pending_Dept_Head", "Pending_Asset_Manager"].includes(t.status)).length;
    const active_bookings = bookings.filter(b => b.status === "Reserved" && new Date(b.end_time).getTime() >= Date.now()).length;
    const audit_pending = audits.filter(a => a.status === "Active").length;

    const total = assets.length;
    const bad = assets.filter(a => ["Maintenance", "Lost"].includes(a.status)).length;
    const department_health = total > 0 ? Math.floor(((total - bad) / total) * 100) : 100;

    return {
      assets_available: avail,
      assets_allocated: allocated,
      maintenance_today: maint_today,
      upcoming_returns,
      pending_allocations,
      active_bookings,
      audit_pending,
      department_health
    };
  }

  getActivityFeed() {
    return this.getStorage("af_activities", [
      { id: 1, user_name: "Marcus Vance", action: "asset_created", target_type: "Asset", details: "Created Laptop profile AST-1001", timestamp: new Date().toISOString() },
      { id: 2, user_name: "Sarah Jenkins", action: "asset_allocated", target_type: "Asset", details: "Allocated AST-1001 to David Chen", timestamp: new Date().toISOString() }
    ]);
  }

  private logActivity(userId: number, userName: string, action: string, targetType: string, targetId: number, details: string) {
    const logs = this.getStorage<ActivityLog[]>("af_activities", []);
    logs.unshift({
      id: Date.now(),
      user_id: userId,
      user_name: userName,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      timestamp: new Date().toISOString()
    });
    this.setStorage("af_activities", logs.slice(0, 50));
  }

  private sendNotification(empId: number, title: string, message: string, type: any) {
    const notifs = this.getStorage<AppNotification[]>("af_notifications", INITIAL_NOTIFICATIONS);
    notifs.unshift({
      id: Date.now(),
      employee_id: empId,
      title,
      message,
      read: false,
      type,
      created_at: new Date().toISOString()
    });
    this.setStorage("af_notifications", notifs);
  }
}

const mock = new SimulatedBackend();

function getHeaders() {
  const token = localStorage.getItem("af_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const api = {
  async login(email: string, pw: string) {
    try {
      if (supabaseActive && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        
        // Sync with backend using Decoded JWT
        const token = data.session?.access_token || "";
        localStorage.setItem("af_token", token);
        
        const syncRes = await fetch(`${API_BASE}/auth/supabase-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        if (!syncRes.ok) throw new Error("Sync failed");
        const userObj = await syncRes.json();
        
        const sessionData = {
          access_token: token,
          token_type: "bearer",
          role: userObj.role,
          full_name: userObj.full_name,
          email: userObj.email,
          id: userObj.id,
          department_id: userObj.department_id
        };
        localStorage.setItem("af_user", JSON.stringify(sessionData));
        return sessionData;
      }

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem("af_token", data.access_token);
      localStorage.setItem("af_user", JSON.stringify(data));
      return data;
    } catch (err: any) {
      // Mock Auth check
      const emps = mock.getEmployees();
      const emp = emps.find(e => e.email === email);
      if (emp && emp.status === "suspended") {
        throw new Error("Account is suspended or pending approval");
      }
      if (emp && pw.length >= 6) {
        const data = {
          access_token: "mock-token-session",
          token_type: "bearer",
          role: emp.role,
          full_name: emp.full_name,
          email: emp.email,
          id: emp.id,
          department_id: emp.department_id
        };
        localStorage.setItem("af_token", data.access_token);
        localStorage.setItem("af_user", JSON.stringify(data));
        return data;
      }
      throw new Error(err.message || "Invalid username or password credentials");
    }
  },

  async signup(email: string, pw: string, fullName: string) {
    try {
      if (supabaseActive && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        
        // Sync / Provision with FastAPI database
        const token = data.session?.access_token || "";
        const syncRes = await fetch(`${API_BASE}/auth/supabase-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        if (!syncRes.ok) throw new Error("Supabase sync failed");
        return await syncRes.json();
      }

      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw, full_name: fullName })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch (err: any) {
      const emps = mock.getEmployees();
      const exists = emps.find(e => e.email === email);
      if (exists) throw new Error("Email already registered");
      const newEmp: Employee = {
        id: Date.now(),
        email,
        full_name: fullName,
        role: "employee", // Default Signup role
        status: "active",
        created_at: new Date().toISOString()
      };
      emps.push(newEmp);
      localStorage.setItem("af_employees", JSON.stringify(emps));
      return newEmp;
    }
  },

  async getMe() {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      const userStr = localStorage.getItem("af_user");
      if (!userStr) throw new Error("Not logged in");
      const userObj = JSON.parse(userStr);
      // Fetch fresh employee info from mock list
      const emps = mock.getEmployees();
      const current = emps.find(e => e.email === userObj.email);
      if (!current) throw new Error("Employee no longer exists");
      return current;
    }
  },

  logout() {
    localStorage.removeItem("af_token");
    localStorage.removeItem("af_user");
    if (supabaseActive && supabase) {
      supabase.auth.signOut();
    }
  },

  async forgotPassword(email: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return { message: "Recovery token generated if account exists", token: "AF-RESET-TOKEN-12345" };
    }
  },

  async resetPassword(email: string, token: string, pw: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password: pw })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      if (token !== "AF-RESET-TOKEN-12345") throw new Error("Invalid or expired reset token");
      return { status: "success", message: "Password updated successfully" };
    }
  },

  async changePassword(currentPw: string, newPw: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ current_password: currentPw, new_password: newPw })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return { status: "success", message: "Password changed successfully" };
    }
  },

  async updateProfile(fullName?: string, profilePhoto?: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ full_name: fullName, profile_photo: profilePhoto })
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      
      const cached = localStorage.getItem("af_user");
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.full_name = updated.full_name;
        localStorage.setItem("af_user", JSON.stringify(parsed));
      }
      return updated;
    } catch {
      const cached = localStorage.getItem("af_user");
      if (!cached) throw new Error("Not logged in");
      const userObj = JSON.parse(cached);
      
      const emps = mock.getEmployees();
      const empIndex = emps.findIndex(e => e.email === userObj.email);
      if (empIndex !== -1) {
        if (fullName) emps[empIndex].full_name = fullName;
        if (profilePhoto) emps[empIndex].profile_photo = profilePhoto;
        localStorage.setItem("af_employees", JSON.stringify(emps));
        
        userObj.full_name = emps[empIndex].full_name;
        localStorage.setItem("af_user", JSON.stringify(userObj));
        return emps[empIndex];
      }
      throw new Error("Employee not found");
    }
  },

  async updateEmployeeStatus(empId: number, status: string) {
    try {
      const res = await fetch(`${API_BASE}/employees/${empId}/status`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      const emps = mock.getEmployees();
      const empIndex = emps.findIndex(e => e.id === empId);
      if (empIndex !== -1) {
        emps[empIndex].status = status;
        localStorage.setItem("af_employees", JSON.stringify(emps));
        return emps[empIndex];
      }
      throw new Error("Employee not found");
    }
  },

  async assignEmployeeDepartment(empId: number, deptId?: number) {
    try {
      const url = `${API_BASE}/employees/${empId}/assign-dept${deptId ? `?dept_id=${deptId}` : ''}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: getHeaders()
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      const emps = mock.getEmployees();
      const empIndex = emps.findIndex(e => e.id === empId);
      if (empIndex !== -1) {
        emps[empIndex].department_id = deptId;
        localStorage.setItem("af_employees", JSON.stringify(emps));
        return emps[empIndex];
      }
      throw new Error("Employee not found");
    }
  },

  async updateDepartment(deptId: number, name: string, parentId?: number, managerId?: number) {
    try {
      const res = await fetch(`${API_BASE}/departments/${deptId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ name, parent_id: parentId, manager_id: managerId })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      const depts = mock.getDepts();
      const idx = depts.findIndex(d => d.id === deptId);
      if (idx !== -1) {
        depts[idx].name = name;
        depts[idx].parent_id = parentId;
        depts[idx].manager_id = managerId;
        localStorage.setItem("af_departments", JSON.stringify(depts));
        return depts[idx];
      }
      throw new Error("Department not found");
    }
  },

  async deleteDepartment(deptId: number) {
    try {
      const res = await fetch(`${API_BASE}/departments/${deptId}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      let depts = mock.getDepts();
      depts = depts.filter(d => d.id !== deptId);
      // Remove relationships
      depts.forEach(d => {
        if (d.parent_id === deptId) d.parent_id = undefined;
      });
      localStorage.setItem("af_departments", JSON.stringify(depts));
      
      const emps = mock.getEmployees();
      emps.forEach(e => {
        if (e.department_id === deptId) e.department_id = undefined;
      });
      localStorage.setItem("af_employees", JSON.stringify(emps));
      return { status: "success" };
    }
  },

  async fetchAssetCategories() {
    try {
      const res = await fetch(`${API_BASE}/asset-categories`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      const catsStr = localStorage.getItem("af_categories");
      if (catsStr) {
        return JSON.parse(catsStr);
      }
      const initialCats = [
        { id: 1, name: "Laptops", description: "Portable laptop work systems" },
        { id: 2, name: "Furniture", description: "Office desks, chairs, and cabinets" },
        { id: 3, name: "Vehicles", description: "Corporate transport fleet" },
        { id: 4, name: "Meeting Rooms", description: "Physical booking rooms" },
        { id: 5, name: "Audio Visual", description: "Projectors, TV screens, and sound equipment" }
      ];
      localStorage.setItem("af_categories", JSON.stringify(initialCats));
      return initialCats;
    }
  },

  async createAssetCategory(name: string, description?: string) {
    try {
      const res = await fetch(`${API_BASE}/asset-categories`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name, description })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      const cats = await this.fetchAssetCategories();
      const newCat = {
        id: Date.now(),
        name,
        description
      };
      cats.push(newCat);
      localStorage.setItem("af_categories", JSON.stringify(cats));
      return newCat;
    }
  },

  async updateAssetCategory(id: number, name: string, description?: string) {
    try {
      const res = await fetch(`${API_BASE}/asset-categories/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ name, description })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      const cats = await this.fetchAssetCategories();
      const idx = cats.findIndex((c: any) => c.id === id);
      if (idx !== -1) {
        cats[idx].name = name;
        cats[idx].description = description;
        localStorage.setItem("af_categories", JSON.stringify(cats));
        return cats[idx];
      }
      throw new Error("Category not found");
    }
  },

  async deleteAssetCategory(id: number) {
    try {
      const res = await fetch(`${API_BASE}/asset-categories/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      let cats = await this.fetchAssetCategories();
      cats = cats.filter((c: any) => c.id !== id);
      localStorage.setItem("af_categories", JSON.stringify(cats));
      return { status: "success" };
    }
  },

  async fetchDepartments() {
    try {
      const res = await fetch(`${API_BASE}/departments`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getDepts();
    }
  },

  async createDepartment(name: string, managerId?: number) {
    try {
      const res = await fetch(`${API_BASE}/departments?name=${encodeURIComponent(name)}&manager_id=${managerId || ''}`, {
        method: "POST",
        headers: getHeaders()
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.createDept(name, managerId);
    }
  },

  async fetchEmployees() {
    try {
      const res = await fetch(`${API_BASE}/employees`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getEmployees();
    }
  },

  async promoteEmployee(id: number, role: string) {
    try {
      const res = await fetch(`${API_BASE}/employees/${id}/promote`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ role })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.promoteEmployee(id, role as any);
    }
  },

  async fetchAssets(params?: { category?: string; status?: string; bookable?: boolean; search?: string }) {
    try {
      let url = `${API_BASE}/assets?`;
      if (params?.category) url += `category=${encodeURIComponent(params.category)}&`;
      if (params?.status) url += `status=${encodeURIComponent(params.status)}&`;
      if (params?.bookable !== undefined) url += `bookable=${params.bookable}&`;
      if (params?.search) url += `search=${encodeURIComponent(params.search)}`;

      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      let items = mock.getAssets();
      if (params?.category) items = items.filter(i => i.category === params.category);
      if (params?.status) items = items.filter(i => i.status === params.status);
      if (params?.bookable !== undefined) items = items.filter(i => i.bookable === params.bookable);
      if (params?.search) {
        const query = params.search.toLowerCase();
        items = items.filter(i => 
          i.name.toLowerCase().includes(query) || 
          i.asset_tag.toLowerCase().includes(query) || 
          i.serial_number?.toLowerCase().includes(query)
        );
      }
      return items;
    }
  },

  async createAsset(asset: Omit<Asset, "id" | "asset_tag" | "status" | "qr_code_url" | "created_at">) {
    try {
      const res = await fetch(`${API_BASE}/assets`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(asset)
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.createAsset(asset);
    }
  },

  async updateAsset(id: number, payload: Partial<Asset>) {
    try {
      const res = await fetch(`${API_BASE}/assets/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.updateAsset(id, payload);
    }
  },

  async allocateAsset(payload: { asset_id: number; employee_id?: number; department_id?: number; expected_return_date?: string; notes?: string }) {
    try {
      const res = await fetch(`${API_BASE}/allocations`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.allocateAsset(payload);
    }
  },

  async returnAsset(allocId: number, notes?: string) {
    try {
      const res = await fetch(`${API_BASE}/allocations/${allocId}/return?notes=${notes ? encodeURIComponent(notes) : ''}`, {
        method: "POST",
        headers: getHeaders()
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.returnAsset(allocId, notes);
    }
  },

  async fetchAllocations() {
    return mock.getAllocations();
  },

  async fetchTransfers() {
    try {
      const res = await fetch(`${API_BASE}/transfers`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getTransfers();
    }
  },

  async requestTransfer(asset_id: number, target_dept_id: number, target_emp_id: number, requesterId: number) {
    try {
      const res = await fetch(`${API_BASE}/transfers`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ asset_id, target_department_id: target_dept_id, target_employee_id: target_emp_id })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.requestTransfer({ asset_id, target_department_id: target_dept_id, target_employee_id: target_emp_id }, requesterId);
    }
  },

  async approveTransfer(transferId: number, approved: boolean, notes: string, approverId: number, role: string) {
    try {
      const res = await fetch(`${API_BASE}/transfers/${transferId}/approve`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ approved, notes })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.approvalTransfer(transferId, approved, notes, approverId, role);
    }
  },

  async fetchBookings() {
    try {
      const res = await fetch(`${API_BASE}/bookings`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getBookings();
    }
  },

  async createBooking(booking: { resource_name: string; resource_type: string; start_time: string; end_time: string; purpose?: string }, userId: number) {
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(booking)
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      // Construct full booking payload including booked_by_id for the mock
      const fullBooking = { ...booking, booked_by_id: userId };
      return mock.createBooking(fullBooking, userId);
    }
  },

  async cancelBooking(bookingId: number, userId: number) {
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: getHeaders()
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.cancelBooking(bookingId, userId);
    }
  },

  async updateBooking(bookingId: number, payload: Partial<Booking>, userId: number) {
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.updateBooking(bookingId, payload, userId);
    }
  },

  async fetchMaintenance() {
    try {
      const res = await fetch(`${API_BASE}/maintenance`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getMaintenance();
    }
  },
  async reportMaintenance(assetId: number, title: string, description: string, priority: string, reporterId: number, photoUrl?: string) {
    try {
      const res = await fetch(`${API_BASE}/maintenance`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ asset_id: assetId, title, description, priority, photo_url: photoUrl })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.reportMaintenance(assetId, title, description, priority as any, reporterId, photoUrl);
    }
  },

  async updateMaintenanceStatus(id: number, status: string, tech: string, notes: string, managerId: number) {
    try {
      const res = await fetch(`${API_BASE}/maintenance/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status, technician_assigned: tech, resolution_notes: notes })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.updateMaintenance(id, status as any, tech, notes, managerId);
    }
  },

  async fetchAudits() {
    try {
      const res = await fetch(`${API_BASE}/audits`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getAudits();
    }
  },

  async createAuditCycle(name: string, deptScope?: string, locScope?: string, userId?: number, assignedAuditorId?: number) {
    try {
      const res = await fetch(`${API_BASE}/audits`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ 
          name, 
          department_scope: deptScope, 
          location_scope: locScope,
          assigned_auditor_id: assignedAuditorId
        })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.createAuditCycle(name, deptScope, locScope, userId, assignedAuditorId);
    }
  },

  async verifyAuditAsset(cycleId: number, assetId: number, verifiedStatus: "Verified" | "Missing" | "Damaged", notes?: string, userId?: number) {
    try {
      const res = await fetch(`${API_BASE}/audits/${cycleId}/verify`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ asset_id: assetId, verified_status: verifiedStatus, notes })
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.verifyAuditAsset(cycleId, assetId, verifiedStatus, notes, userId);
    }
  },

  async closeAuditCycle(cycleId: number, summary?: string, userId?: number) {
    try {
      const res = await fetch(`${API_BASE}/audits/${cycleId}/close?summary=${summary ? encodeURIComponent(summary) : ''}`, {
        method: "POST",
        headers: getHeaders()
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.closeAuditCycle(cycleId, summary, userId);
    }
  },

  async fetchAuditVerifications(cycleId: number) {
    try {
      const res = await fetch(`${API_BASE}/audits/${cycleId}/verifications`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getVerifications().filter(v => v.audit_cycle_id === cycleId);
    }
  },

  async fetchDashboardStats() {
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getDashboardStats();
    }
  },

  async fetchActivityFeed() {
    try {
      const res = await fetch(`${API_BASE}/dashboard/activity`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getActivityFeed();
    }
  },

  async fetchNotifications(userId: number) {
    try {
      const res = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getNotifications(userId);
    }
  },

  async markNotificationRead(id: number) {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, { method: "POST", headers: getHeaders() });
    } catch {
      mock.markNotificationRead(id);
    }
  },

  async markAllNotificationsRead(userId: number) {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, { method: "POST", headers: getHeaders() });
    } catch {
      mock.markAllNotificationsRead(userId);
    }
  },

  async fetchReminders(userId: number) {
    try {
      const res = await fetch(`${API_BASE}/reminders`, { headers: getHeaders() });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getReminders(userId);
    }
  },

  async createReminder(payload: { title: string; message: string; scheduled_for: string; priority: string }, userId: number) {
    try {
      const res = await fetch(`${API_BASE}/reminders`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.createReminder(payload, userId);
    }
  },

  async cancelReminder(reminderId: number) {
    try {
      await fetch(`${API_BASE}/reminders/${reminderId}/cancel`, { method: "POST", headers: getHeaders() });
    } catch {
      mock.cancelReminder(reminderId);
    }
  },

  async deleteAsset(id: number) {
    try {
      const res = await fetch(`${API_BASE}/assets/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.deleteAsset(id);
    }
  },

  async fetchAssetHistory(id: number) {
    try {
      const res = await fetch(`${API_BASE}/assets/${id}/history`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch {
      return mock.getAssetHistory(id);
    }
  },

  async uploadFile(file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: {
          "Authorization": getHeaders()["Authorization"] || ""
        },
        body: formData
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return { 
        url: data.file_url,
        file_url: data.file_url 
      };
    } catch {
      // Offline fallback: create local object URL representation
      const localUrl = URL.createObjectURL(file);
      return { 
        url: localUrl,
        file_url: localUrl 
      };
    }
  }
};
