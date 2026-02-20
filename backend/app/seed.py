"""
Seed script for admin-only tables.

IMPORTANT: This does NOT seed shared tables (users, sessions, generation_jobs,
etc.) — those are populated by the video-gen backend from real user activity.
Only admin infrastructure tables (staff accounts, roles, model configs,
feature flags, API keys) are seeded here.
"""
import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.middleware.auth import hash_password
from app.models.models import (
    ADMIN_TABLES,
    ApiKey,
    FeatureFlag,
    ModelConfig,
    Role,
    StaffAccount,
    StaffRole,
)


MODELS = ["stable-diffusion-xl", "dall-e-3", "midjourney-v6", "flux-pro", "imagen-3"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def run_seed(db: Session) -> None:
    # ── Roles ──────────────────────────────────────────────────────────
    role_names = ["viewer", "support", "ops", "billing", "admin", "owner"]
    roles = {}
    for name in role_names:
        r = Role(id=str(uuid.uuid4()), name=name)
        db.add(r)
        db.flush()
        roles[name] = r
    db.commit()

    # ── Admin staff account ────────────────────────────────────────────
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

    # ── Model configs ──────────────────────────────────────────────────
    for name in MODELS:
        import random

        mc = ModelConfig(
            id=str(uuid.uuid4()),
            name=name,
            enabled=True,
            token_cost=random.choice([5, 10, 15, 20, 25]),
            concurrency_limit=random.choice([5, 10, 20]),
        )
        db.add(mc)
    db.commit()

    # ── Feature flags ──────────────────────────────────────────────────
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

    # ── API keys ───────────────────────────────────────────────────────
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
    """Create admin-only tables and seed them if they are empty.

    Shared tables (users, sessions, generation_jobs, etc.) are NOT created
    here — they must already exist in the PostgreSQL database, created by
    the SQL schema files in db/.
    """
    # Only create admin-specific tables, never touch shared production tables
    Base.metadata.create_all(bind=engine, tables=ADMIN_TABLES)

    db = SessionLocal()
    try:
        if db.query(Role).count() == 0:
            run_seed(db)
            print("Admin tables seeded successfully.")
        else:
            print("Admin tables already have data; skipping seed.")
    finally:
        db.close()
