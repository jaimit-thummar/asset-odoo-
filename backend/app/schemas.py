from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


# Auth Schemas
class EmployeeSignUp(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str


class EmployeeLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    email: str


# Department Schemas
class DepartmentBase(BaseModel):
    name: str
    organization_id: int
    parent_id: Optional[int] = None
    manager_id: Optional[int] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentOut(DepartmentBase):
    id: int
    class Config:
        from_attributes = True


# Employee Display Schemas
class EmployeeOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    status: str
    profile_photo: Optional[str] = None
    department_id: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True


class EmployeePromote(BaseModel):
    role: str # admin, asset_manager, department_head, employee


# Asset Schemas
class AssetBase(BaseModel):
    serial_number: Optional[str] = None
    name: str
    description: Optional[str] = None
    category: str
    purchase_date: Optional[datetime] = None
    purchase_cost: float = 0.0
    warranty_expiration: Optional[datetime] = None
    condition: str = "Excellent"
    location: Optional[str] = None
    bookable: bool = False
    department_id: Optional[int] = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    bookable: Optional[bool] = None
    status: Optional[str] = None
    department_id: Optional[int] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_cost: Optional[float] = None
    warranty_expiration: Optional[datetime] = None
    image_url: Optional[str] = None
    document_url: Optional[str] = None


class AssetOut(AssetBase):
    id: int
    asset_tag: str
    status: str
    qr_code_url: Optional[str] = None
    image_url: Optional[str] = None
    document_url: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True


# Allocation Schemas
class AllocationCreate(BaseModel):
    asset_id: int
    employee_id: Optional[int] = None
    department_id: Optional[int] = None
    expected_return_date: Optional[datetime] = None
    notes: Optional[str] = None


class AllocationOut(BaseModel):
    id: int
    asset_id: int
    employee_id: Optional[int] = None
    department_id: Optional[int] = None
    allocated_by_id: Optional[int] = None
    allocated_at: datetime
    expected_return_date: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    notes: Optional[str] = None
    status: str
    class Config:
        from_attributes = True


# Transfer Schemas
class TransferRequestCreate(BaseModel):
    asset_id: int
    target_department_id: int
    target_employee_id: int


class TransferApprove(BaseModel):
    approved: bool
    notes: Optional[str] = None


class TransferRequestOut(BaseModel):
    id: int
    asset_id: int
    requested_by_id: int
    target_department_id: int
    target_employee_id: int
    dept_head_approved: Optional[bool]
    dept_head_approver_id: Optional[int]
    dept_head_notes: Optional[str]
    asset_manager_approved: Optional[bool]
    asset_manager_approver_id: Optional[int]
    asset_manager_notes: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# Booking Schemas
class BookingCreate(BaseModel):
    resource_name: str
    resource_type: str
    start_time: datetime
    end_time: datetime
    purpose: Optional[str] = None


class BookingOut(BaseModel):
    id: int
    resource_name: str
    resource_type: str
    booked_by_id: int
    start_time: datetime
    end_time: datetime
    purpose: Optional[str]
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


# Maintenance Schemas
class MaintenanceIssueCreate(BaseModel):
    asset_id: int
    title: str
    description: str
    priority: str = "Medium"
    photo_url: Optional[str] = None


class MaintenanceStatusUpdate(BaseModel):
    status: str # Approved, In_Progress, Resolved, Rejected
    technician_assigned: Optional[str] = None
    resolution_notes: Optional[str] = None


class MaintenanceIssueOut(BaseModel):
    id: int
    asset_id: int
    reported_by_id: int
    title: str
    description: str
    priority: str
    status: str
    technician_assigned: Optional[str]
    resolution_notes: Optional[str]
    photo_url: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


# Audit Cycle Schemas
class AuditCycleCreate(BaseModel):
    name: str
    department_scope: Optional[str] = None
    location_scope: Optional[str] = None
    assigned_auditor_id: Optional[int] = None


class AuditVerificationCreate(BaseModel):
    asset_id: int
    verified_status: str # Verified, Missing, Damaged
    notes: Optional[str] = None


class AuditVerificationOut(BaseModel):
    id: int
    audit_cycle_id: int
    asset_id: int
    scanned_by_id: int
    verified_status: str
    scanned_at: datetime
    notes: Optional[str]
    class Config:
        from_attributes = True


class AuditCycleOut(BaseModel):
    id: int
    name: str
    created_by_id: int
    assigned_auditor_id: Optional[int] = None
    department_scope: Optional[str]
    location_scope: Optional[str]
    status: str
    created_at: datetime
    closed_at: Optional[datetime]
    report_summary: Optional[str]
    class Config:
        from_attributes = True


# Dashboard Statistics Summary
class DashboardStats(BaseModel):
    assets_available: int
    assets_allocated: int
    maintenance_today: int
    upcoming_returns: int
    pending_allocations: int
    active_bookings: int
    audit_pending: int
    department_health: int


# New Schema additions for Org Setup and RBAC
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    password: str = Field(..., min_length=6)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_photo: Optional[str] = None


class EmployeeStatusUpdate(BaseModel):
    status: str # active, suspended


class AssetCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class AssetCategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    class Config:
        from_attributes = True


class DepartmentUpdate(BaseModel):
    name: str
    parent_id: Optional[int] = None
    manager_id: Optional[int] = None


class BookingUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    purpose: Optional[str] = None
    status: Optional[str] = None


class ScheduledReminderCreate(BaseModel):
    title: str
    message: str
    scheduled_for: datetime
    priority: str = "info" # info, success, warning, danger


class ScheduledReminderOut(BaseModel):
    id: int
    employee_id: int
    title: str
    message: str
    scheduled_for: datetime
    priority: str
    executed: bool
    created_at: datetime
    class Config:
        from_attributes = True

