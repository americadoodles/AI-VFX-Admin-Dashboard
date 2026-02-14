import hashlib
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.middleware.auth import hash_password
from app.models.models import (
    ApiKey,
    AuditLog,
    EventLog,
    FeatureFlag,
    GenerationJob,
    MediaAsset,
    ModelConfig,
    Role,
    StaffAccount,
    StaffRole,
    TokenTransaction,
    TokenWallet,
    User,
)

# Deterministic-ish data for reproducibility
FIRST_NAMES = [
    "James", "Emma", "Liam", "Olivia", "Noah", "Ava", "Oliver", "Sophia",
    "Elijah", "Isabella", "Lucas", "Mia", "Mason", "Charlotte", "Ethan", "Amelia",
    "Alexander", "Harper", "Henry", "Evelyn", "Jacob", "Abigail", "Michael", "Emily",
]
LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor",
]
DOMAINS = ["example.com", "studio.io", "vfx.co", "creative.dev", "film.net"]
PLANS = ["free", "pro", "enterprise"]
STATUSES = ["active", "active", "active", "suspended"]
JOB_STATUSES = ["pending", "running", "completed", "completed", "completed", "failed", "cancelled"]
MODELS = ["stable-diffusion-xl", "dall-e-3", "midjourney-v6", "flux-pro", "imagen-3"]
EVENT_TYPES = ["project.create", "shot.generate", "asset.upload", "user.login", "export.complete"]
TX_TYPES = ["credit_grant", "purchase", "usage_debit", "refund", "adjustment"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def random_date(days_back: int) -> datetime:
    return utc_now() - timedelta(days=random.randint(0, days_back))


def run_seed(db: Session) -> None:
    # Roles
    role_names = ["viewer", "support", "ops", "billing", "admin", "owner"]
    roles = {}
    for name in role_names:
        r = Role(id=str(uuid.uuid4()), name=name)
        db.add(r)
        db.flush()
        roles[name] = r
    db.commit()

    # Admin staff
    admin_staff = StaffAccount(
        id=str(uuid.uuid4()),
        email="admin@admin.com",
        name="Admin User",
        hashed_password=hash_password("admin123"),
        is_active=True,
        mfa_enabled=False,
    )
    db.add(admin_staff)
    db.flush()
    for rname in ["admin", "owner"]:
        db.add(StaffRole(staff_id=admin_staff.id, role_id=roles[rname].id))
    db.commit()

    # Users (50)
    user_ids: List[str] = []
    for i in range(50):
        uid = str(uuid.uuid4())
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        email = f"{first.lower()}.{last.lower()}{i}@{random.choice(DOMAINS)}"
        user = User(
            id=uid,
            email=email,
            name=f"{first} {last}",
            status=random.choice(STATUSES),
            created_at=random_date(365),
            last_login_at=random_date(30) if random.random() > 0.3 else None,
            org_id=str(uuid.uuid4()) if random.random() > 0.5 else None,
            mfa_enabled=random.random() > 0.7,
            verified_at=random_date(200) if random.random() > 0.2 else None,
            linked_providers=[],
            plan=random.choice(PLANS),
            storage_used_bytes=random.randint(0, 5_000_000_000),
            hashed_password=hash_password("user123"),
        )
        db.add(user)
        user_ids.append(uid)
    db.commit()

    # Token wallets + transactions (200+)
    for uid in user_ids:
        wallet = TokenWallet(user_id=uid, balance=random.randint(0, 5000))
        db.add(wallet)
    db.commit()

    tx_count = 0
    for _ in range(210):
        uid = random.choice(user_ids)
        amount = random.choice([-50, -100, -200, 100, 200, 500, 1000])
        tx_type = random.choice(TX_TYPES)
        if amount > 0:
            tx_type = random.choice(["credit_grant", "purchase", "refund", "adjustment"])
        tx = TokenTransaction(
            id=str(uuid.uuid4()),
            user_id=uid,
            amount=amount,
            type=tx_type,
            reason="Seeded data",
            ref_type="seed",
            ref_id=str(uuid.uuid4()),
            created_at=random_date(90),
            created_by_admin_id=admin_staff.id if amount > 0 and random.random() > 0.5 else None,
        )
        db.add(tx)
        tx_count += 1
    db.commit()

    # Recompute wallet balances from transactions
    for uid in user_ids:
        w = db.query(TokenWallet).filter(TokenWallet.user_id == uid).first()
        if w:
            total = (
                db.query(func.sum(TokenTransaction.amount))
                .filter(TokenTransaction.user_id == uid)
                .scalar()
                or 0
            )
            w.balance = max(0, int(total))
    db.commit()

    # Generation jobs (100+)
    for _ in range(105):
        uid = random.choice(user_ids)
        status = random.choice(JOB_STATUSES)
        created = random_date(60)
        completed = created + timedelta(seconds=random.randint(5, 120)) if status in ("completed", "failed", "cancelled") else None
        job = GenerationJob(
            id=str(uuid.uuid4()),
            user_id=uid,
            shot_id=str(uuid.uuid4()),
            project_id=str(uuid.uuid4()),
            status=status,
            model=random.choice(MODELS),
            prompt="A cinematic shot of " + random.choice(["forest", "city", "space", "ocean"]),
            settings_json={"steps": 30, "cfg": 7.5},
            output_urls=[f"https://cdn.example.com/out/{uuid.uuid4()}.png"] if status == "completed" else None,
            error_trace="OutOfMemoryError" if status == "failed" else None,
            tokens_consumed=random.randint(10, 200) if status in ("completed", "failed") else None,
            duration_ms=random.randint(1000, 60000) if status == "completed" else None,
            created_at=created,
            completed_at=completed,
        )
        db.add(job)
    db.commit()

    # Event logs (50+)
    for _ in range(55):
        e = EventLog(
            id=str(uuid.uuid4()),
            type=random.choice(EVENT_TYPES),
            user_id=random.choice(user_ids) if random.random() > 0.2 else None,
            org_id=str(uuid.uuid4()) if random.random() > 0.5 else None,
            project_id=str(uuid.uuid4()),
            shot_id=str(uuid.uuid4()) if random.random() > 0.5 else None,
            payload_json={"seed": True},
            created_at=random_date(30),
        )
        db.add(e)
    db.commit()

    # Audit logs (20+)
    for _ in range(25):
        a = AuditLog(
            id=str(uuid.uuid4()),
            actor_id=admin_staff.id,
            action=random.choice(["user.suspend", "user.unsuspend", "tokens.grant", "user.view"]),
            target_type="user",
            target_id=random.choice(user_ids),
            before_json={},
            after_json={},
            ip="127.0.0.1",
            user_agent="Seed",
            created_at=random_date(14),
        )
        db.add(a)
    db.commit()

    # Media assets (30+)
    for _ in range(35):
        uid = random.choice(user_ids)
        ext = random.choice(["png", "jpg", "mp4"])
        m = MediaAsset(
            id=str(uuid.uuid4()),
            user_id=uid,
            project_id=str(uuid.uuid4()),
            filename=f"asset_{uuid.uuid4().hex[:8]}.{ext}",
            kind=random.choice(["image", "video", "reference"]),
            source=random.choice(["upload", "generated"]),
            size_bytes=random.randint(1000, 50_000_000),
            url=f"https://cdn.example.com/{uuid.uuid4()}",
            flagged=random.random() > 0.9,
            flag_reason="Review" if random.random() > 0.9 else None,
            created_at=random_date(45),
        )
        db.add(m)
    db.commit()

    # Model configs (5)
    for name in MODELS:
        mc = ModelConfig(
            id=str(uuid.uuid4()),
            name=name,
            enabled=random.random() > 0.2,
            token_cost=random.choice([5, 10, 15, 20, 25]),
            concurrency_limit=random.choice([5, 10, 20]),
        )
        db.add(mc)
    db.commit()

    # Feature flags (5)
    flags_data = [
        ("new_ui", True, 100, "New dashboard UI"),
        ("beta_models", False, 10, "Beta model access"),
        ("bulk_export", True, 50, "Bulk export"),
        ("api_v2", False, 0, "API v2"),
        ("maintenance_mode", False, 0, "Maintenance"),
    ]
    for name, enabled, pct, desc in flags_data:
        f = FeatureFlag(
            id=str(uuid.uuid4()),
            name=name,
            enabled=enabled,
            rollout_percent=pct,
            description=desc,
        )
        db.add(f)
    db.commit()

    # API keys (2)
    for name, key_suffix in [("CI Key", "ci"), ("Dev Key", "dev")]:
        raw = f"avfx_{uuid.uuid4().hex}_{key_suffix}"
        key_hash = hashlib.sha256(raw.encode()).hexdigest()
        k = ApiKey(
            id=str(uuid.uuid4()),
            name=name,
            key_hash=key_hash,
            scopes=["read", "write"],
            created_by=admin_staff.id,
            expires_at=utc_now() + timedelta(days=365),
        )
        db.add(k)
    db.commit()


def seed_if_empty() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Role).count() == 0:
            run_seed(db)
            print("Database seeded successfully.")
        else:
            print("Database already has data; skipping seed.")
    finally:
        db.close()
