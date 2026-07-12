import sys
from datetime import datetime, timedelta
from app.database import (
    SessionLocal, init_db, Organization, Department, Employee, Asset,
    AssetAllocation, Booking, MaintenanceIssue, AuditCycle, AuditVerification, ActivityLog
)
from app.security import hash_password

def seed_db():
    print("Initializing Database structure...")
    sys.path.append(".")
    init_db()
    
    db = SessionLocal()
    
    # Check if seed has already run
    if db.query(Organization).count() > 0:
        print("Database already contains data. Skipping seeding.")
        db.close()
        return

    print("Seeding Enterprise Organization Data...")
    
    # 1. Organizations
    org = Organization(name="AssetFlow Global Corp")
    db.add(org)
    db.commit()
    db.refresh(org)

    # 2. Departments
    engineering = Department(name="Engineering & IT", organization_id=org.id)
    marketing = Department(name="Marketing & Design", organization_id=org.id)
    operations = Department(name="Operations & Legal", organization_id=org.id)
    
    db.add_all([engineering, marketing, operations])
    db.commit()
    db.refresh(engineering)
    db.refresh(marketing)
    db.refresh(operations)

    # 3. Staff / Employees (Admin, Asset Manager, Dept Head, standard Employee)
    admin_pw = hash_password("admin123")
    manager_pw = hash_password("manager123")
    head_pw = hash_password("head123")
    emp_pw = hash_password("employee123")

    emp_admin = Employee(
        email="admin@assetflow.com",
        hashed_password=admin_pw,
        full_name="Sarah Jenkins",
        role="admin",
        status="active",
        department_id=engineering.id,
        profile_photo="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
    )
    
    emp_manager = Employee(
        email="manager@assetflow.com",
        hashed_password=manager_pw,
        full_name="Marcus Vance",
        role="asset_manager",
        status="active",
        department_id=engineering.id,
        profile_photo="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
    )

    emp_head = Employee(
        email="head@assetflow.com",
        hashed_password=head_pw,
        full_name="Elena Rostova",
        role="department_head",
        status="active",
        department_id=marketing.id,
        profile_photo="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
    )

    emp_regular = Employee(
        email="employee@assetflow.com",
        hashed_password=emp_pw,
        full_name="David Chen",
        role="employee",
        status="active",
        department_id=engineering.id,
        profile_photo="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
    )

    # Assign Department Managers
    marketing.manager_id = emp_head.id
    engineering.manager_id = emp_admin.id

    db.add_all([emp_admin, emp_manager, emp_head, emp_regular])
    db.commit()
    db.refresh(emp_admin)
    db.refresh(emp_manager)
    db.refresh(emp_head)
    db.refresh(emp_regular)

    print("Seeding Asset Registry...")
    
    # 4. Assets
    assets = [
        # IT Assets
        Asset(
            asset_tag="AST-1001",
            serial_number="C02X87GBJG5H",
            name="MacBook Pro 16\" M3 Max",
            description="36GB RAM, 1TB SSD Space Gray. Developer setup.",
            category="Laptops",
            purchase_date=datetime.utcnow() - timedelta(days=365),
            purchase_cost=3499.00,
            warranty_expiration=datetime.utcnow() + timedelta(days=365),
            condition="Excellent",
            location="HQ - Floor 3",
            status="Allocated",
            bookable=False,
            department_id=engineering.id,
            qr_code_url="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AST-1001"
        ),
        Asset(
            asset_tag="AST-1002",
            serial_number="C02Y789ABJ21",
            name="iPad Pro 12.9\" M2",
            description="Wi-Fi + Cellular 256GB. Used for designers ui layouts.",
            category="Laptops",
            purchase_date=datetime.utcnow() - timedelta(days=200),
            purchase_cost=1199.00,
            warranty_expiration=datetime.utcnow() + timedelta(days=165),
            condition="Good",
            location="HQ - Floor 2",
            status="Available",
            bookable=False,
            department_id=marketing.id,
            qr_code_url="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AST-1002"
        ),
        # AV Equipment
        Asset(
            asset_tag="AST-1003",
            serial_number="SN-SONY-PROJ839",
            name="Sony 4K Laser Projector",
            description="Ultra Short Throw High Lumens Projector",
            category="Audio Visual",
            purchase_date=datetime.utcnow() - timedelta(days=100),
            purchase_cost=2499.00,
            warranty_expiration=datetime.utcnow() + timedelta(days=730),
            condition="Excellent",
            location="HQ - Room 4B",
            status="Available",
            bookable=True, # Active Bookable item
            department_id=marketing.id,
            qr_code_url="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AST-1003"
        ),
        # Furniture Assets
        Asset(
            asset_tag="AST-1004",
            serial_number="HM-AERON-7298",
            name="Herman Miller Aeron Chair",
            description="Size B, Fully Adjustable, PostureFit SL.",
            category="Furniture",
            purchase_date=datetime.utcnow() - timedelta(days=400),
            purchase_cost=1495.00,
            warranty_expiration=datetime.utcnow() + timedelta(days=1000),
            condition="Good",
            location="HQ - Floor 3",
            status="Allocated",
            bookable=False,
            department_id=engineering.id,
            qr_code_url="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AST-1004"
        ),
        # Transport Vehicles
        Asset(
            asset_tag="AST-1005",
            serial_number="5YJ3E1EBXLF12",
            name="Tesla Model 3 Corporate Car",
            description="Dual Motor All-Wheel Drive, Long Range, White.",
            category="Vehicles",
            purchase_date=datetime.utcnow() - timedelta(days=500),
            purchase_cost=45990.00,
            warranty_expiration=datetime.utcnow() + timedelta(days=200),
            condition="Good",
            location="hq - Garage 2",
            status="Maintenance", # Active Maintenance item
            bookable=True,
            department_id=operations.id,
            qr_code_url="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AST-1005"
        )
    ]
    
    db.add_all(assets)
    db.commit()
    for a in assets:
        db.refresh(a)

    print("Seeding Allocations...")
    
    # 5. Connect allocations
    alloc1 = AssetAllocation(
        asset_id=assets[0].id,
        employee_id=emp_regular.id,
        allocated_by_id=emp_manager.id,
        allocated_at=datetime.utcnow() - timedelta(days=30),
        expected_return_date=datetime.utcnow() + timedelta(days=90),
        notes="Setup for development workspace.",
        status="active"
    )
    alloc2 = AssetAllocation(
        asset_id=assets[3].id,
        employee_id=emp_head.id,
        allocated_by_id=emp_manager.id,
        allocated_at=datetime.utcnow() - timedelta(days=12),
        expected_return_date=datetime.utcnow() + timedelta(days=300),
        notes="Assigned for ergonomics.",
        status="active"
    )
    db.add_all([alloc1, alloc2])

    print("Seeding Calendar Bookings...")
    
    # 6. Bookings
    bookings = [
        Booking(
            resource_name="Boardroom Crimson",
            resource_type="Room",
            booked_by_id=emp_regular.id,
            start_time=datetime.utcnow() + timedelta(hours=2),
            end_time=datetime.utcnow() + timedelta(hours=4),
            purpose="Monthly Engineering Architecture Sync",
            status="Reserved"
        ),
        Booking(
            resource_name="Audio Visual - Sony Projector AST-1003",
            resource_type="Projector",
            booked_by_id=emp_head.id,
            start_time=datetime.utcnow() + timedelta(days=1, hours=3),
            end_time=datetime.utcnow() + timedelta(days=1, hours=6),
            purpose="Marketing Q3 Strategy Presentation",
            status="Reserved"
        )
    ]
    db.add_all(bookings)

    print("Seeding Maintenance tickets...")
    
    # 7. Maintenance Issue
    maint = MaintenanceIssue(
        asset_id=assets[4].id,
        reported_by_id=emp_regular.id,
        title="Left Headlight Flicker",
        description="Left LED matrix headlight flickers intermittently when active.",
        priority="Medium",
        status="Pending",
        created_at=datetime.utcnow() - timedelta(days=2)
    )
    db.add(maint)

    print("Seeding Auditing Cycle...")
    
    # 8. Audit Cycle
    audit = AuditCycle(
        name="Q3 HQ Technology Audit",
        created_by_id=emp_admin.id,
        department_scope="Engineering & IT, Marketing & Design",
        location_scope="HQ - Floor 3",
        status="Active",
        created_at=datetime.utcnow() - timedelta(days=1)
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    
    # Verify first asset scanned
    verify = AuditVerification(
        audit_cycle_id=audit.id,
        asset_id=assets[0].id,
        scanned_by_id=emp_manager.id,
        verified_status="Verified",
        scanned_at=datetime.utcnow(),
        notes="Verified in developer cubicle A4"
    )
    db.add(verify)

    # 9. Activity Logs
    logs = [
        ActivityLog(user_id=emp_manager.id, user_name=emp_manager.full_name, action="asset_created", target_type="Asset", target_id=assets[0].id, details="Created Laptop profile AST-1001"),
        ActivityLog(user_id=emp_manager.id, user_name=emp_manager.full_name, action="asset_allocated", target_type="Asset", target_id=assets[0].id, details=f"Allocated AST-1001 to {emp_regular.full_name}"),
        ActivityLog(user_id=emp_regular.id, user_name=emp_regular.full_name, action="resource_booked", target_type="Booking", target_id=bookings[0].id, details="Reserved Boardroom Crimson"),
        ActivityLog(user_id=emp_regular.id, user_name=emp_regular.full_name, action="maintenance_reported", target_type="MaintenanceIssue", target_id=maint.id, details="Reported Tesla headlight issue")
    ]
    db.add_all(logs)
    
    db.commit()
    print("Database seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed_db()
