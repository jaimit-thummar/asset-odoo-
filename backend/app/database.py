import os
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Table, Index
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./assetflow.db")

# Setup engine with SQLite support check
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    departments = relationship("Department", back_populates="organization", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    manager_id = Column(Integer, nullable=True) # ID of the employee who manages the department

    # Relationships
    organization = relationship("Organization", back_populates="departments")
    employees = relationship("Employee", foreign_keys="[Employee.department_id]", back_populates="department")
    subdepartments = relationship("Department", backref="parent_dept", remote_side=[id])
    assets = relationship("Asset", back_populates="department")

    __table_args__ = (
        Index("idx_dept_org", "organization_id"),
    )


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="employee") # admin, asset_manager, department_head, employee
    status = Column(String, default="active") # active, suspended, pending
    profile_photo = Column(String, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    department = relationship("Department", foreign_keys=[department_id], back_populates="employees")
    allocations = relationship("AssetAllocation", foreign_keys="[AssetAllocation.employee_id]", back_populates="employee")
    bookings = relationship("Booking", back_populates="booked_by")
    reported_issues = relationship("MaintenanceIssue", foreign_keys="[MaintenanceIssue.reported_by_id]", back_populates="reported_by")
    notifications = relationship("Notification", back_populates="employee", cascade="all, delete-orphan")
    reminders = relationship("ScheduledReminder", back_populates="employee", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_employee_email", "email"),
        Index("idx_employee_role", "role"),
    )


class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_tag = Column(String, unique=True, index=True, nullable=False) # Auto-generated e.g., AST-0001
    serial_number = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    category = Column(String, nullable=False) # Laptops, Furniture, Vehicles, Meeting Rooms, Audio Visual
    purchase_date = Column(DateTime, nullable=True)
    purchase_cost = Column(Float, default=0.0)
    warranty_expiration = Column(DateTime, nullable=True)
    condition = Column(String, default="Excellent") # Excellent, Good, Fair, Poor, Broken
    location = Column(String, nullable=True)
    status = Column(String, default="Available") # Available, Allocated, Maintenance, Disposed, Lost
    bookable = Column(Boolean, default=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    qr_code_url = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    document_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="assets")
    allocations = relationship("AssetAllocation", back_populates="asset", cascade="all, delete-orphan")
    maintenance_issues = relationship("MaintenanceIssue", back_populates="asset", cascade="all, delete-orphan")
    verifications = relationship("AuditVerification", back_populates="asset", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_asset_tag", "asset_tag"),
        Index("idx_asset_status", "status"),
        Index("idx_asset_category", "category"),
    )


class AssetAllocation(Base):
    __tablename__ = "asset_allocations"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=True)
    allocated_by_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    allocated_at = Column(DateTime, default=datetime.utcnow)
    expected_return_date = Column(DateTime, nullable=True)
    returned_at = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    status = Column(String, default="active") # active, returned

    # Relationships
    asset = relationship("Asset", back_populates="allocations")
    employee = relationship("Employee", foreign_keys=[employee_id], back_populates="allocations")
    department = relationship("Department")

    __table_args__ = (
        Index("idx_alloc_asset", "asset_id"),
        Index("idx_alloc_employee", "employee_id"),
    )


class TransferRequest(Base):
    __tablename__ = "transfer_requests"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    requested_by_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    target_department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    target_employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    # Dual-level approvals
    dept_head_approved = Column(Boolean, nullable=True) # None=Pending, True=Approved, False=Rejected
    dept_head_approver_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    dept_head_notes = Column(String, nullable=True)
    
    asset_manager_approved = Column(Boolean, nullable=True) # None=Pending, True=Approved, False=Rejected
    asset_manager_approver_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    asset_manager_notes = Column(String, nullable=True)
    
    status = Column(String, default="Pending_Dept_Head") # Pending_Dept_Head, Pending_Asset_Manager, Approved, Rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    asset = relationship("Asset")
    requested_by = relationship("Employee", foreign_keys=[requested_by_id])
    target_department = relationship("Department")
    target_employee = relationship("Employee", foreign_keys=[target_employee_id])


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    resource_name = Column(String, nullable=False) # meeting room name, equipment descriptor
    resource_type = Column(String, nullable=False) # Room, Projector, Vehicle, Device
    booked_by_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    purpose = Column(String, nullable=True)
    status = Column(String, default="Reserved") # Reserved, CheckedIn, Cancelled, Completed
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    booked_by = relationship("Employee", back_populates="bookings")

    __table_args__ = (
        Index("idx_booking_resource", "resource_name", "start_time", "end_time"),
    )


class MaintenanceIssue(Base):
    __tablename__ = "maintenance_issues"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    reported_by_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    priority = Column(String, default="Medium") # Low, Medium, High, Urgent
    status = Column(String, default="Pending") # Pending, Approved, In_Progress, Resolved, Rejected
    technician_assigned = Column(String, nullable=True)
    resolution_notes = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    asset = relationship("Asset", back_populates="maintenance_issues")
    reported_by = relationship("Employee", foreign_keys=[reported_by_id], back_populates="reported_issues")

    __table_args__ = (
        Index("idx_maint_asset", "asset_id"),
        Index("idx_maint_status", "status"),
    )


class AuditCycle(Base):
    __tablename__ = "audit_cycles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_by_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    assigned_auditor_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    department_scope = Column(String, nullable=True) # Department names separated by comma, or 'All'
    location_scope = Column(String, nullable=True) # Locations separated by comma, or 'All'
    status = Column(String, default="Active") # Active, Closed
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    report_summary = Column(String, nullable=True) # JSON or summary notes

    # Relationships
    verifications = relationship("AuditVerification", back_populates="audit_cycle", cascade="all, delete-orphan")
    assigned_auditor = relationship("Employee", foreign_keys=[assigned_auditor_id])


class AuditVerification(Base):
    __tablename__ = "audit_verifications"

    id = Column(Integer, primary_key=True, index=True)
    audit_cycle_id = Column(Integer, ForeignKey("audit_cycles.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    scanned_by_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    verified_status = Column(String, default="Verified") # Verified, Missing, Damaged
    scanned_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)

    # Relationships
    audit_cycle = relationship("AuditCycle", back_populates="verifications")
    asset = relationship("Asset", back_populates="verifications")
    scanned_by = relationship("Employee")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    user_name = Column(String, nullable=True)
    action = Column(String, nullable=False) # e.g. "asset_created", "allocated", "booking_cancelled"
    target_type = Column(String, nullable=False) # e.g. "Asset", "Booking", ...
    target_id = Column(Integer, nullable=True)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_log_timestamp", "timestamp"),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    read = Column(Boolean, default=False)
    type = Column(String, default="info") # info, success, warning, danger
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="notifications")

    __table_args__ = (
        Index("idx_notif_unread", "employee_id", "read"),
    )


class ScheduledReminder(Base):
    __tablename__ = "scheduled_reminders"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    scheduled_for = Column(DateTime, nullable=False)
    priority = Column(String, default="info") # info, success, warning, danger
    executed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    employee = relationship("Employee", back_populates="reminders")

    __table_args__ = (
        Index("idx_reminder_exec", "employee_id", "executed"),
    )


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
