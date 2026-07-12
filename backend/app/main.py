import os
import json
import threading
import time
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import (
    init_db, get_db, Employee, Asset, AssetAllocation, TransferRequest,
    Booking, MaintenanceIssue, AuditCycle, AuditVerification, ActivityLog,
    Notification, Department, Organization, AssetCategory, ScheduledReminder,
    SessionLocal
)
from app.security import (
    hash_password, verify_password, create_access_token, get_current_user, RoleChecker
)
from app.schemas import (
    EmployeeSignUp, EmployeeLogin, TokenResponse, EmployeeOut, EmployeePromote,
    DepartmentOut, DepartmentUpdate,
    AssetCreate, AssetUpdate, AssetOut, AllocationCreate, AllocationOut,
    TransferRequestCreate, TransferApprove, TransferRequestOut,
    BookingCreate, BookingOut, BookingUpdate, MaintenanceIssueCreate, MaintenanceStatusUpdate, MaintenanceIssueOut,
    AuditCycleCreate, AuditCycleOut, AuditVerificationCreate, AuditVerificationOut, DashboardStats,
    ForgotPasswordRequest, ResetPasswordRequest, PasswordChangeRequest, EmployeeUpdate,
    EmployeeStatusUpdate, AssetCategoryCreate, AssetCategoryOut,
    ScheduledReminderCreate, ScheduledReminderOut
)

app = FastAPI(title="AssetFlow Pro Enterprise API", version="1.0.0")

# Setup CORS for Vite UI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves static local upload attachments
from fastapi.staticfiles import StaticFiles
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


def reminder_worker():
    while True:
        try:
            db = SessionLocal()
            now = datetime.utcnow()
            pending = db.query(ScheduledReminder).filter(
                ScheduledReminder.scheduled_for <= now,
                ScheduledReminder.executed == False
            ).all()
            for r in pending:
                r.executed = True
                
                # Create Notification object
                notif = Notification(
                    employee_id=r.employee_id,
                    title=r.title,
                    message=r.message,
                    type=r.priority,
                    read=False,
                    created_at=datetime.utcnow()
                )
                db.add(notif)
            db.commit()
            db.close()
        except Exception as e:
            print("Reminder worker exception:", e)
        time.sleep(10)


@app.on_event("startup")
def startup_event():
    init_db()
    threading.Thread(target=reminder_worker, daemon=True).start()


def log_activity(db: Session, user_id: Optional[int], user_name: Optional[str], action: str, target_type: str, target_id: Optional[int], details: str):
    log = ActivityLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()


def send_notification(db: Session, employee_id: int, title: str, message: str, type_: str = "info"):
    notif = Notification(
        employee_id=employee_id,
        title=title,
        message=message,
        type=type_,
        read=False,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()


@app.post("/api/upload")
def upload_file(file: UploadFile = File(...)):
    target_path = f"static/uploads/{file.filename}"
    os.makedirs("static/uploads", exist_ok=True)
    with open(target_path, "wb") as f:
        f.write(file.file.read())
    return {"file_url": f"/static/uploads/{file.filename}"}


# ==========================================
# AUTHENTICATION
# ==========================================

@app.post("/api/auth/signup", response_model=EmployeeOut)
def signup(payload: EmployeeSignUp, db: Session = Depends(get_db)):
    existing = db.query(Employee).filter(Employee.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # The default role is ALWAYS 'employee' (Hackathon Rule: Signup creates only employee account, no role selection)
    hashed = hash_password(payload.password)
    
    # Make the first created employee an Admin if no organization table exists to boot-strap, or default employee
    is_first = db.query(Employee).count() == 0
    role = "admin" if is_first else "employee"

    employee = Employee(
        email=payload.email,
        hashed_password=hashed,
        full_name=payload.full_name,
        role=role,
        status="active",
        created_at=datetime.utcnow()
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    log_activity(db, employee.id, employee.full_name, "employee_registered", "Employee", employee.id, f"Registered as {role}")
    return employee


@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: EmployeeLogin, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.email == payload.email).first()
    if not employee or not verify_password(payload.password, employee.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    if employee.status != "active":
        raise HTTPException(status_code=400, detail="Account is suspended or pending approval")

    token = create_access_token(data={"sub": employee.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": employee.role,
        "full_name": employee.full_name,
        "email": employee.email
    }


@app.get("/api/auth/me", response_model=EmployeeOut)
def get_me(current_user: Employee = Depends(get_current_user)):
    return current_user


@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.email == payload.email).first()
    if not employee:
        # Avoid user enumeration, but return a mock response
        return {"message": "Recovery token generated if account exists", "token": None}
    
    # Generate recovery token
    token = "AF-RESET-TOKEN-12345"
    log_activity(db, employee.id, employee.full_name, "password_reset_requested", "Employee", employee.id, f"Password reset requested. Recovery Token: {token}")
    send_notification(db, employee.id, "Password Reset Code", f"A password reset request was initiated. Your code is {token}.", "warning")
    return {"message": "Recovery token generated if account exists", "token": token}


@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.email == payload.email).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if payload.token != "AF-RESET-TOKEN-12345":
         raise HTTPException(status_code=400, detail="Invalid or expired reset token")
         
    employee.hashed_password = hash_password(payload.password)
    db.commit()
    log_activity(db, employee.id, employee.full_name, "password_reset_completed", "Employee", employee.id, "Password reset successfully completed.")
    send_notification(db, employee.id, "Password reset successful", "Your password has been successfully updated.", "success")
    return {"status": "success", "message": "Password updated successfully"}


@app.post("/api/auth/change-password")
def change_password(payload: PasswordChangeRequest, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid current password")
        
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    log_activity(db, current_user.id, current_user.full_name, "password_changed", "Employee", current_user.id, "Password updated from settings.")
    send_notification(db, current_user.id, "Password changed", "Your password has been changed successfully.", "success")
    return {"status": "success", "message": "Password changed successfully"}


@app.put("/api/auth/profile", response_model=EmployeeOut)
def update_profile(payload: EmployeeUpdate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.profile_photo is not None:
        current_user.profile_photo = payload.profile_photo
        
    db.commit()
    db.refresh(current_user)
    log_activity(db, current_user.id, current_user.full_name, "profile_updated", "Employee", current_user.id, "Updated profile photo / details.")
    return current_user


@app.post("/api/auth/supabase-sync", response_model=EmployeeOut)
def supabase_sync(current_user: Employee = Depends(get_current_user)):
    # get_current_user automatically provisions Supabase users.
    return current_user



# ==========================================
# DEPARTMENTS & EMPLOYEES
# ==========================================

@app.get("/api/departments", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()


@app.post("/api/departments", response_model=DepartmentOut)
def create_department(name: str, org_id: Optional[int] = None, parent_id: Optional[int] = None, manager_id: Optional[int] = None, current_user: Employee = Depends(RoleChecker(["admin"]))):
    db = next(get_db())
    if not org_id:
        org = db.query(Organization).first()
        if not org:
            org = Organization(name="AssetFlow Enterprise")
            db.add(org)
            db.commit()
            db.refresh(org)
        org_id = org.id

    dept = Department(name=name, organization_id=org_id, parent_id=parent_id, manager_id=manager_id)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    log_activity(db, current_user.id, current_user.full_name, "department_created", "Department", dept.id, f"Created department {name}")
    return dept


@app.get("/api/employees", response_model=List[EmployeeOut])
def list_employees(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(Employee).all()


@app.put("/api/employees/{emp_id}/promote", response_model=EmployeeOut)
def promote_employee(emp_id: int, payload: EmployeePromote, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin"]))):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    old_role = emp.role
    emp.role = payload.role
    db.commit()
    db.refresh(emp)

    log_activity(db, current_user.id, current_user.full_name, "role_promoted", "Employee", emp.id, f"Promoted from {old_role} to {payload.role}")
    send_notification(db, emp.id, "Role Updated", f"Your privileges have been upgraded to {payload.role}.", "success")
    return emp


@app.put("/api/employees/{emp_id}/status", response_model=EmployeeOut)
def update_employee_status(emp_id: int, payload: EmployeeStatusUpdate, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin"]))):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    emp.status = payload.status
    db.commit()
    db.refresh(emp)
    log_activity(db, current_user.id, current_user.full_name, "status_changed", "Employee", emp.id, f"Changed status of {emp.full_name} to {payload.status}")
    send_notification(db, emp.id, "Account Status Updated", f"Your account status was set to {payload.status}.", "warning")
    return emp


@app.put("/api/employees/{emp_id}/assign-dept", response_model=EmployeeOut)
def assign_employee_department(emp_id: int, dept_id: Optional[int] = Query(None), db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin"]))):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if dept_id:
        dept = db.query(Department).filter(Department.id == dept_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        emp.department_id = dept_id
    else:
        emp.department_id = None
        
    db.commit()
    db.refresh(emp)
    log_activity(db, current_user.id, current_user.full_name, "assigned_department", "Employee", emp.id, f"Assigned {emp.full_name} to department ID {dept_id}")
    return emp


# Department Edit / Delete
@app.put("/api/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin"]))):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    dept.name = payload.name
    dept.parent_id = payload.parent_id
    dept.manager_id = payload.manager_id
    db.commit()
    db.refresh(dept)
    log_activity(db, current_user.id, current_user.full_name, "department_updated", "Department", dept.id, f"Updated department {dept.name}")
    return dept


@app.delete("/api/departments/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin"]))):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    # Reassign subdepartments
    db.query(Department).filter(Department.parent_id == dept_id).update({Department.parent_id: None})
    # Reassign employees
    db.query(Employee).filter(Employee.department_id == dept_id).update({Employee.department_id: None})
    
    db.delete(dept)
    db.commit()
    log_activity(db, current_user.id, current_user.full_name, "department_deleted", "Department", dept_id, f"Deleted department ID {dept_id}")
    return {"status": "success", "message": "Department deleted"}


# Dynamic Asset Categories CRUD
@app.get("/api/asset-categories", response_model=List[AssetCategoryOut])
def list_asset_categories(db: Session = Depends(get_db)):
    return db.query(AssetCategory).all()


@app.post("/api/asset-categories", response_model=AssetCategoryOut)
def create_asset_category(payload: AssetCategoryCreate, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin", "asset_manager"]))):
    existing = db.query(AssetCategory).filter(AssetCategory.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
        
    cat = AssetCategory(name=payload.name, description=payload.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    log_activity(db, current_user.id, current_user.full_name, "category_created", "AssetCategory", cat.id, f"Created category {cat.name}")
    return cat


@app.put("/api/asset-categories/{cat_id}", response_model=AssetCategoryOut)
def update_asset_category(cat_id: int, payload: AssetCategoryCreate, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin", "asset_manager"]))):
    cat = db.query(AssetCategory).filter(AssetCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    cat.name = payload.name
    cat.description = payload.description
    db.commit()
    db.refresh(cat)
    log_activity(db, current_user.id, current_user.full_name, "category_updated", "AssetCategory", cat.id, f"Updated category {payload.name}")
    return cat


@app.delete("/api/asset-categories/{cat_id}")
def delete_asset_category(cat_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin", "asset_manager"]))):
    cat = db.query(AssetCategory).filter(AssetCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    db.delete(cat)
    db.commit()
    log_activity(db, current_user.id, current_user.full_name, "category_deleted", "AssetCategory", cat_id, f"Deleted category ID {cat_id}")
    return {"status": "success", "message": "Category deleted"}



# ==========================================
# ASSET REGISTRY
# ==========================================

@app.post("/api/assets", response_model=AssetOut)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin", "asset_manager"]))):
    # Auto-generate unique Asset Tag
    cnt = db.query(Asset).count()
    asset_tag = f"AST-{1000 + cnt + 1}"

    # Verify serial uniqueness
    if payload.serial_number:
        exists = db.query(Asset).filter(Asset.serial_number == payload.serial_number).first()
        if exists:
            raise HTTPException(status_code=400, detail="Serial number already exists")

    asset = Asset(
        asset_tag=asset_tag,
        serial_number=payload.serial_number,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        purchase_date=payload.purchase_date,
        purchase_cost=payload.purchase_cost,
        warranty_expiration=payload.warranty_expiration,
        condition=payload.condition,
        location=payload.location,
        status="Available",
        bookable=payload.bookable,
        department_id=payload.department_id,
        qr_code_url=f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={asset_tag}"
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    log_activity(db, current_user.id, current_user.full_name, "asset_created", "Asset", asset.id, f"Registered asset {asset.name} ({asset_tag})")
    return asset


@app.get("/api/assets", response_model=List[AssetOut])
def list_assets(
    category: Optional[str] = None,
    status: Optional[str] = None,
    bookable: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 1000,
    skip: int = 0,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    query = db.query(Asset)
    if category:
        query = query.filter(Asset.category == category)
    if status:
        query = query.filter(Asset.status == status)
    if bookable is not None:
        query = query.filter(Asset.bookable == bookable)
    if search:
        query = query.filter((Asset.name.ilike(f"%{search}%")) | (Asset.asset_tag.ilike(f"%{search}%")) | (Asset.serial_number.ilike(f"%{search}%")))
    return query.offset(skip).limit(limit).all()


@app.get("/api/assets/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@app.put("/api/assets/{asset_id}", response_model=AssetOut)
def update_asset(asset_id: int, payload: AssetUpdate, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin", "asset_manager"]))):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(asset, k, v)
    
    db.commit()
    db.refresh(asset)
    log_activity(db, current_user.id, current_user.full_name, "asset_updated", "Asset", asset.id, f"Updated key values of {asset.name}")
    return asset


@app.delete("/api/assets/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin", "asset_manager"]))):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    db.delete(asset)
    db.commit()
    log_activity(db, current_user.id, current_user.full_name, "asset_deleted", "Asset", asset_id, f"Asset deleted: {asset.name} ({asset.asset_tag})")
    return {"status": "success", "message": "Asset deleted successfully"}


@app.get("/api/assets/{asset_id}/history")
def get_asset_history(asset_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(ActivityLog).filter(
        ActivityLog.target_type == "Asset",
        ActivityLog.target_id == asset_id
    ).order_by(ActivityLog.timestamp.desc()).all()


@app.post("/api/upload")
def upload_file(file: UploadFile = File(...)):
    import time
    import shutil
    upload_dir = os.path.join("static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Prefix filename to prevent overwrites
    filename = f"{int(time.time())}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"http://localhost:8000/static/uploads/{filename}"}


# ==========================================
# ASSET ALLOCATION
# ==========================================

@app.post("/api/allocations", response_model=AllocationOut)
def allocate_asset(payload: AllocationCreate, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin", "asset_manager"]))):
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Check Business Rules: Cannot allocate un-available asset (Overlap protection)
    if asset.status != "Available":
        raise HTTPException(status_code=400, detail=f"Asset is currently not available (status: {asset.status}). Clear allocations or maintenance issues first.")
        
    # Enforce Mutual Exclusion of target types
    if (payload.employee_id is not None) and (payload.department_id is not None):
        raise HTTPException(status_code=400, detail="Allocation can target either an employee or a department, but not both simultaneously")
    if (payload.employee_id is None) and (payload.department_id is None):
        raise HTTPException(status_code=400, detail="Provide either employee_id or department_id to allocate custody")
        
    # Validate expected return date logic
    if payload.expected_return_date:
        # Allow same-day but block past dates
        db_now = datetime.utcnow()
        if payload.expected_return_date.date() < db_now.date():
            raise HTTPException(status_code=400, detail="Expected return date cannot be in the past")

    emp_name = "N/A"
    dept_name = "N/A"
    
    # Validate and set relationships
    if payload.employee_id:
        emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Target employee not found")
        emp_name = emp.full_name
        # Align asset department location
        if emp.department_id:
            asset.department_id = emp.department_id
            
    if payload.department_id:
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Target department not found")
        dept_name = dept.name
        asset.department_id = payload.department_id

    allocation = AssetAllocation(
        asset_id=payload.asset_id,
        employee_id=payload.employee_id,
        department_id=payload.department_id,
        allocated_by_id=current_user.id,
        allocated_at=datetime.utcnow(),
        expected_return_date=payload.expected_return_date,
        notes=payload.notes,
        status="active"
    )
    db.add(allocation)
    
    # Toggle asset status (Locking resource)
    asset.status = "Allocated"
    db.commit()
    db.refresh(allocation)

    target_desc = f"employee {emp_name}" if payload.employee_id else f"department {dept_name}"
    log_activity(db, current_user.id, current_user.full_name, "asset_allocated", "Asset", asset.id, f"Allocated asset {asset.name} to {target_desc}")
    
    # Send Notifications
    if payload.employee_id:
        send_notification(
            db, payload.employee_id, "Asset Allocated",
            f"You have been assigned: {asset.name} ({asset.asset_tag}). expected return: {payload.expected_return_date.strftime('%Y-%m-%d') if payload.expected_return_date else 'Unlimited'}.",
            "success"
        )
    elif payload.department_id:
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if dept and dept.manager_id:
            send_notification(
                db, dept.manager_id, "Department Asset Allocated",
                f"Asset {asset.name} ({asset.asset_tag}) checked out to your department '{dept.name}'.",
                "success"
            )
            
    return allocation


@app.post("/api/allocations/{alloc_id}/return", response_model=AllocationOut)
def return_asset(alloc_id: int, notes: Optional[str] = None, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin", "asset_manager"]))):
    allocation = db.query(AssetAllocation).filter(AssetAllocation.id == alloc_id).first()
    if not allocation or allocation.status != "active":
        raise HTTPException(status_code=404, detail="Active allocation not found")
        
    asset = db.query(Asset).filter(Asset.id == allocation.asset_id).first()
    if asset:
        asset.status = "Available"

    allocation.status = "returned"
    allocation.returned_at = datetime.utcnow()
    allocation.notes = notes or allocation.notes

    db.commit()
    db.refresh(allocation)

    log_activity(db, current_user.id, current_user.full_name, "asset_returned", "Asset", asset.id if asset else None, f"Returned allocation of {asset.name if asset else 'unknown'}")
    
    # Send Notifications on Return
    if allocation.employee_id:
        send_notification(db, allocation.employee_id, "Asset Return Handled", f"Your return for {asset.name if asset else 'asset'} has been checked in successfully.", "info")
    elif allocation.department_id:
        dept = db.query(Department).filter(Department.id == allocation.department_id).first()
        if dept and dept.manager_id:
            send_notification(db, dept.manager_id, "Department Asset Returned", f"Asset {asset.name if asset else 'asset'} checked out to your department was returned.", "info")
            
    return allocation


# ==========================================
# TRANSFER WORKFLOWS (Employee -> Dept Head -> Asset Manager)
# ==========================================

@app.post("/api/transfers", response_model=TransferRequestOut)
def request_transfer(payload: TransferRequestCreate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Must be currently allocated to match holding transfer request
    if asset.status != "Allocated":
        raise HTTPException(status_code=400, detail="Only allocated assets can be requested for transfer")

    # Access Protection: Only direct holding user, department head, or Admins/Asset Managers can initiate a transfer request
    alloc = db.query(AssetAllocation).filter(
        AssetAllocation.asset_id == asset.id,
        AssetAllocation.status == "active"
    ).first()
    
    if current_user.role not in ["admin", "asset_manager"]:
        if not alloc:
            raise HTTPException(status_code=400, detail="No active allocation found for this asset")
        
        is_owner = alloc.employee_id == current_user.id
        is_dept_manager = False
        if alloc.department_id:
            dept = db.query(Department).filter(Department.id == alloc.department_id).first()
            if dept and dept.manager_id == current_user.id:
                is_dept_manager = True
                
        if not (is_owner or is_dept_manager):
            raise HTTPException(status_code=403, detail="You do not have custody of this asset or manage the department holding it")

    # Create transfer log
    transfer = TransferRequest(
        asset_id=payload.asset_id,
        requested_by_id=current_user.id,
        target_department_id=payload.target_department_id,
        target_employee_id=payload.target_employee_id,
        status="Pending_Dept_Head"
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)

    log_activity(db, current_user.id, current_user.full_name, "transfer_requested", "Asset", asset.id, f"Requested transfer to dept {payload.target_department_id}")
    
    # Notify department head (mocking email flow logic)
    head_dept = db.query(Department).filter(Department.id == current_user.department_id).first()
    if head_dept and head_dept.manager_id:
        send_notification(db, head_dept.manager_id, "Resource Transfer Approval Required", f"Employee {current_user.full_name} has requested transferring {asset.name}.", "warning")
        
    return transfer


@app.put("/api/transfers/{transfer_id}/approve", response_model=TransferRequestOut)
def approve_transfer(transfer_id: int, payload: TransferApprove, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    transfer = db.query(TransferRequest).filter(TransferRequest.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer request not found")

    if transfer.status == "Pending_Dept_Head":
        # Must be a Department Head or Admin
        if current_user.role not in ["department_head", "admin"]:
            raise HTTPException(status_code=403, detail="Only Department Heads or Admins can approve phase 1")
        
        transfer.dept_head_approved = payload.approved
        transfer.dept_head_approver_id = current_user.id
        transfer.dept_head_notes = payload.notes
        
        if payload.approved:
            transfer.status = "Pending_Asset_Manager"
            # Alert Asset Managers
            managers = db.query(Employee).filter(Employee.role == "asset_manager").all()
            for mgr in managers:
                send_notification(db, mgr.id, "Asset Manager Sign-off Pending", f"Department head approved transfer of asset tag. Manager sign-off required.", "warning")
        else:
            transfer.status = "Rejected"
            send_notification(db, transfer.requested_by_id, "Transfer Request Rejected", f"Dept Head rejected your transfer: {payload.notes}", "danger")
            
    elif transfer.status == "Pending_Asset_Manager":
        # Must be an Asset Manager or Admin
        if current_user.role not in ["asset_manager", "admin"]:
            raise HTTPException(status_code=403, detail="Only Asset Managers or Admins can approve phase 2")
            
        transfer.asset_manager_approved = payload.approved
        transfer.asset_manager_approver_id = current_user.id
        transfer.asset_manager_notes = payload.notes
        
        if payload.approved:
            transfer.status = "Approved"
            
            # Execute physical database transfer allocation swap!
            asset = db.query(Asset).filter(Asset.id == transfer.asset_id).first()
            if asset:
                asset.department_id = transfer.target_department_id
                
                # Deactivate old allocation
                old_allocation = db.query(AssetAllocation).filter(
                    AssetAllocation.asset_id == asset.id,
                    AssetAllocation.status == "active"
                ).first()
                if old_allocation:
                    old_allocation.status = "returned"
                    old_allocation.returned_at = datetime.utcnow()
                    old_allocation.notes = f"Returned via transfer request approve log #{transfer.id}"
                
                # Assign new allocation
                new_allocation = AssetAllocation(
                    asset_id=asset.id,
                    employee_id=transfer.target_employee_id,
                    allocated_by_id=current_user.id,
                    allocated_at=datetime.utcnow(),
                    status="active",
                    notes="Assigned via Transfer Request approval"
                )
                db.add(new_allocation)
                
            db.commit()
            log_activity(db, current_user.id, current_user.full_name, "transfer_approved", "Asset", transfer.asset_id, f"Approved transfer request #{transfer.id}")
            send_notification(db, transfer.requested_by_id, "Transfer Process Completed", f"Transfer has been approved and completed successfully!", "success")
            send_notification(db, transfer.target_employee_id, "Asset Transferred to You", f"Asset has been transferred to your custody.", "success")
        else:
            transfer.status = "Rejected"
            send_notification(db, transfer.requested_by_id, "Transfer Request Rejected", f"Asset manager rejected transfer: {payload.notes}", "danger")

    db.commit()
    db.refresh(transfer)
    return transfer


# ==========================================
# RESOURCE BOOKINGS (Rooms, Vehicles, Projectors)
# ==========================================

@app.post("/api/bookings", response_model=BookingOut)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    # Check Business Rules: No overlapping bookings
    overlap = db.query(Booking).filter(
        Booking.resource_name == payload.resource_name,
        Booking.status == "Reserved",
        Booking.start_time < payload.end_time,
        Booking.end_time > payload.start_time
    ).first()
    
    if overlap:
        raise HTTPException(
            status_code=400,
            detail=f"Resource {payload.resource_name} is already booked from {overlap.start_time.strftime('%H:%M')} to {overlap.end_time.strftime('%H:%M')}."
        )

    booking = Booking(
        resource_name=payload.resource_name,
        resource_type=payload.resource_type,
        booked_by_id=current_user.id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        purpose=payload.purpose,
        status="Reserved"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    log_activity(db, current_user.id, current_user.full_name, "resource_booked", "Booking", booking.id, f"Booked room/equipment {booking.resource_name}")
    send_notification(db, current_user.id, "Booking Confirmed", f"Your reservation for {booking.resource_name} is scheduled successfully.", "success")
    return booking


@app.get("/api/bookings", response_model=List[BookingOut])
def list_bookings(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(Booking).all()


@app.put("/api/bookings/{booking_id}", response_model=BookingOut)
def update_booking(booking_id: int, payload: BookingUpdate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking details not found")
        
    # Permission context: only owner or Admin can reschedule/update
    if booking.booked_by_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this reservation slot")
        
    start_time = payload.start_time or booking.start_time
    end_time = payload.end_time or booking.end_time
    
    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")
        
    # Overlap validation on resources
    overlap = db.query(Booking).filter(
        Booking.id != booking.id,
        Booking.resource_name == booking.resource_name,
        Booking.status == "Reserved",
        Booking.start_time < end_time,
        Booking.end_time > start_time
    ).first()
    
    if overlap:
        raise HTTPException(
            status_code=400,
            detail=f"Resource conflict: already booked from {overlap.start_time.strftime('%H:%M')} to {overlap.end_time.strftime('%H:%M')}."
        )
        
    # Apply changes
    if payload.start_time:
        booking.start_time = payload.start_time
    if payload.end_time:
        booking.end_time = payload.end_time
    if payload.purpose is not None:
        booking.purpose = payload.purpose
    if payload.status:
        booking.status = payload.status
        
    db.commit()
    db.refresh(booking)
    
    log_activity(db, current_user.id, current_user.full_name, "resource_booking_updated", "Booking", booking.id, f"Rescheduled/Updated reservation for {booking.resource_name}")
    
    # Notify Owner on reschedule
    send_notification(
        db, booking.booked_by_id, "Booking Details Updated",
        f"Your reservation for {booking.resource_name} has been updated. start: {booking.start_time.strftime('%Y-%m-%d %H:%M')}.",
        "info"
    )
    return booking


@app.post("/api/bookings/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found")

    # Ownership check: only the creator or an admin can cancel
    if booking.booked_by_id != current_user.id and current_user.role not in ["admin", "asset_manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    # Guard against double-cancellation
    if booking.status == "Cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    booking.status = "Cancelled"
    db.commit()
    db.refresh(booking)

    log_activity(db, current_user.id, current_user.full_name, "booking_cancelled", "Booking", booking.id, f"Cancelled booking of {booking.resource_name}")
    send_notification(db, booking.booked_by_id, "Booking Cancelled", f"Your booking reservation for {booking.resource_name} has been cancelled.", "warning")
    return booking


# ==========================================
# MAINTENANCE CYCLE
# ==========================================

@app.post("/api/maintenance", response_model=MaintenanceIssueOut)
def report_maintenance(payload: MaintenanceIssueCreate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    issue = MaintenanceIssue(
        asset_id=payload.asset_id,
        reported_by_id=current_user.id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        status="Pending",
        photo_url=payload.photo_url
    )
    db.add(issue)
    
    # Update Asset status automatically to reflect issue
    asset.status = "Maintenance"
    
    db.commit()
    db.refresh(issue)

    log_activity(db, current_user.id, current_user.full_name, "maintenance_reported", "MaintenanceIssue", issue.id, f"Reported issue on {asset.name}: {payload.title}")
    
    # Notify Asset managers
    managers = db.query(Employee).filter(Employee.role == "asset_manager").all()
    for mgr in managers:
        send_notification(db, mgr.id, "New Fault Ticket", f"Asset {asset.name} reported damaged with priority {payload.priority}.", "danger")

    return issue


@app.put("/api/maintenance/{issue_id}", response_model=MaintenanceIssueOut)
def update_maintenance_status(issue_id: int, payload: MaintenanceStatusUpdate, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin", "asset_manager"]))):
    issue = db.query(MaintenanceIssue).filter(MaintenanceIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Maintenance issue not found")

    old_status = issue.status
    if payload.status:
        issue.status = payload.status
    if payload.technician_assigned:
        issue.technician_assigned = payload.technician_assigned
    if payload.resolution_notes:
        issue.resolution_notes = payload.resolution_notes

    # Update asset state depending on workflow
    asset = db.query(Asset).filter(Asset.id == issue.asset_id).first()
    if asset:
        if issue.status == "Resolved":
            asset.status = "Available"
        elif issue.status == "Rejected":
            # Revert to Available or Allocated depending on allocations
            active_alloc = db.query(AssetAllocation).filter(AssetAllocation.asset_id == asset.id, AssetAllocation.status == "active").first()
            asset.status = "Allocated" if active_alloc else "Available"

    db.commit()
    db.refresh(issue)

    log_activity(db, current_user.id, current_user.full_name, "maintenance_updated", "MaintenanceIssue", issue.id, f"Transitioned maintenance status from {old_status} to {issue.status}")
    send_notification(db, issue.reported_by_id, "Maintenance Update", f"Ticket '{issue.title}' transition state: {issue.status}", "success" if issue.status == "Resolved" else "info")
    return issue


@app.get("/api/maintenance", response_model=List[MaintenanceIssueOut])
def list_maintenance_tickets(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(MaintenanceIssue).all()


# ==========================================
# AUDITING
# ==========================================

@app.post("/api/audits", response_model=AuditCycleOut)
def create_audit_cycle(payload: AuditCycleCreate, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin", "asset_manager"]))):
    cycle = AuditCycle(
        name=payload.name,
        created_by_id=current_user.id,
        assigned_auditor_id=payload.assigned_auditor_id,
        department_scope=payload.department_scope or "All",
        location_scope=payload.location_scope or "All",
        status="Active",
        created_at=datetime.utcnow()
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)

    if cycle.assigned_auditor_id:
        send_notification(
            db,
            cycle.assigned_auditor_id,
            "Assigned to Audit Cycle",
            f"You have been assigned as the auditor for '{cycle.name}'.",
            "info"
        )

    log_activity(db, current_user.id, current_user.full_name, "audit_cycle_created", "AuditCycle", cycle.id, f"Created audit cycle '{cycle.name}'")
    return cycle


@app.post("/api/audits/{cycle_id}/verify", response_model=AuditVerificationOut)
def verify_audit_asset(cycle_id: int, payload: AuditVerificationCreate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    cycle = db.query(AuditCycle).filter(AuditCycle.id == cycle_id).first()
    if not cycle or cycle.status != "Active":
        raise HTTPException(status_code=400, detail="Active audit cycle not found")

    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Guard: prevent duplicate scan of same asset within same audit cycle
    existing_scan = db.query(AuditVerification).filter(
        AuditVerification.audit_cycle_id == cycle_id,
        AuditVerification.asset_id == payload.asset_id
    ).first()
    if existing_scan:
        raise HTTPException(
            status_code=409,
            detail=f"Asset {asset.asset_tag} has already been scanned in this audit cycle (status: {existing_scan.verified_status}). Use a new cycle for re-auditing."
        )

    # Update asset conditions based on verified status
    if payload.verified_status == "Damaged":
        asset.condition = "Poor"
        asset.status = "Maintenance"
    elif payload.verified_status == "Missing":
        asset.status = "Lost"

    # Create verification record
    verification = AuditVerification(
        audit_cycle_id=cycle_id,
        asset_id=payload.asset_id,
        scanned_by_id=current_user.id,
        verified_status=payload.verified_status,
        scanned_at=datetime.utcnow(),
        notes=payload.notes
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)

    log_activity(db, current_user.id, current_user.full_name, "audit_asset_scanned", "AuditVerification", verification.id, f"Scanned asset {asset.asset_tag}: {payload.verified_status}")
    return verification


@app.post("/api/audits/{cycle_id}/close", response_model=AuditCycleOut)
def close_audit_cycle(cycle_id: int, summary: Optional[str] = None, db: Session = Depends(get_db), current_user: Employee = Depends(RoleChecker(["admin", "asset_manager"]))):
    cycle = db.query(AuditCycle).filter(AuditCycle.id == cycle_id).first()
    if not cycle or cycle.status != "Active":
        raise HTTPException(status_code=400, detail="Active audit cycle not found")

    # Collate discrepancy summaries
    total_scanned = db.query(AuditVerification).filter(AuditVerification.audit_cycle_id == cycle_id).count()
    missing_cnt = db.query(AuditVerification).filter(
        AuditVerification.audit_cycle_id == cycle_id,
        AuditVerification.verified_status == "Missing"
    ).count()
    damaged_cnt = db.query(AuditVerification).filter(
        AuditVerification.audit_cycle_id == cycle_id,
        AuditVerification.verified_status == "Damaged"
    ).count()

    summary_obj = {
        "closed_by": current_user.full_name,
        "scanned_assets": total_scanned,
        "missing_assets": missing_cnt,
        "damaged_assets": damaged_cnt,
        "notes": summary or "Standard closure."
    }

    cycle.status = "Closed"
    cycle.closed_at = datetime.utcnow()
    cycle.report_summary = json.dumps(summary_obj)

    db.commit()
    db.refresh(cycle)

    log_activity(db, current_user.id, current_user.full_name, "audit_cycle_closed", "AuditCycle", cycle.id, f"Closed audit cycle. Summary: {cycle.report_summary}")
    return cycle


@app.get("/api/audits", response_model=List[AuditCycleOut])
def list_audits(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(AuditCycle).all()


@app.get("/api/audits/{cycle_id}/verifications", response_model=List[AuditVerificationOut])
def get_audit_verifications(cycle_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(AuditVerification).filter(AuditVerification.audit_cycle_id == cycle_id).all()


# ==========================================
# NOTIFICATIONS & TIMELINE
# ==========================================

@app.get("/api/notifications")
def get_notifications(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(Notification).filter(Notification.employee_id == current_user.id).order_by(Notification.created_at.desc()).all()


@app.post("/api/notifications/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    db.query(Notification).filter(
        Notification.employee_id == current_user.id,
        Notification.read == False
    ).update({Notification.read: True}, synchronize_session=False)
    db.commit()
    return {"status": "success"}


@app.post("/api/notifications/{notif_id}/read")
def mark_read(notif_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.employee_id == current_user.id).first()
    if notif:
        notif.read = True
        db.commit()
    return {"status": "success"}


@app.get("/api/reminders", response_model=List[ScheduledReminderOut])
def get_reminders(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    return db.query(ScheduledReminder).filter(
        ScheduledReminder.employee_id == current_user.id,
        ScheduledReminder.executed == False
    ).order_by(ScheduledReminder.scheduled_for.asc()).all()


@app.post("/api/reminders", response_model=ScheduledReminderOut)
def create_reminder(payload: ScheduledReminderCreate, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    # Prevent scheduling reminders in the past
    if payload.scheduled_for <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reminder must be scheduled for a future date and time")

    reminder = ScheduledReminder(
        employee_id=current_user.id,
        title=payload.title,
        message=payload.message,
        scheduled_for=payload.scheduled_for,
        priority=payload.priority,
        executed=False,
        created_at=datetime.utcnow()
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@app.post("/api/reminders/{reminder_id}/cancel")
def cancel_reminder(reminder_id: int, db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    reminder = db.query(ScheduledReminder).filter(
        ScheduledReminder.id == reminder_id,
        ScheduledReminder.employee_id == current_user.id
    ).first()
    if reminder:
        db.delete(reminder)
        db.commit()
    return {"status": "success"}


# ==========================================
# DASHBOARD STATISTICS AGGREGATION
# ==========================================

@app.get("/api/dashboard/stats", response_model=DashboardStats)
def fetch_dashboard_stats(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    # 8 KPI Metrics
    avail = db.query(Asset).filter(Asset.status == "Available").count()
    allocated = db.query(Asset).filter(Asset.status == "Allocated").count()
    
    # Maintenance items due today
    maint_today = db.query(MaintenanceIssue).filter(
        MaintenanceIssue.status.in_(["Pending", "Approved", "In_Progress"])
    ).count()

    # Returns within next 7 days
    upcoming_ret = db.query(AssetAllocation).filter(
        AssetAllocation.status == "active",
        AssetAllocation.expected_return_date <= datetime.utcnow() + timedelta(days=7)
    ).count()

    # Pending Transfer Requests
    pending_alloc = db.query(TransferRequest).filter(
        TransferRequest.status.in_(["Pending_Dept_Head", "Pending_Asset_Manager"])
    ).count()

    # Active reservations
    act_bookings = db.query(Booking).filter(
        Booking.status == "Reserved",
        Booking.end_time >= datetime.utcnow()
    ).count()

    # Active / Pending Audit cycles
    aud_pending = db.query(AuditCycle).filter(AuditCycle.status == "Active").count()

    # Department Health score: simple metric (100 - % of items in maintenance/lost)
    total_assets = db.query(Asset).count()
    if total_assets > 0:
        bad_assets = db.query(Asset).filter(Asset.status.in_(["Maintenance", "Lost"])).count()
        dept_health = int(((total_assets - bad_assets) / total_assets) * 100)
    else:
        dept_health = 100

    return {
        "assets_available": avail,
        "assets_allocated": allocated,
        "maintenance_today": maint_today,
        "upcoming_returns": upcoming_ret,
        "pending_allocations": pending_alloc,
        "active_bookings": act_bookings,
        "audit_pending": aud_pending,
        "department_health": dept_health
    }


@app.get("/api/dashboard/activity")
def get_activity_feed(db: Session = Depends(get_db), current_user: Employee = Depends(get_current_user)):
    # Return last 30 activities
    return db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(30).all()
