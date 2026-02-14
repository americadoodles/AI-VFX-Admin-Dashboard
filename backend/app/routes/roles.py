import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_staff, hash_password, require_role
from app.models.models import ApiKey, Role, StaffAccount, StaffRole
from app.schemas.schemas import ApiKeyCreate, ApiKeyOut, StaffCreate, StaffOut, StaffUpdate

router = APIRouter(prefix="/admin", tags=["roles"])


def get_staff_role_names(db: Session, staff_id: str) -> list[str]:
    rows = (
        db.query(Role.name)
        .join(StaffRole, StaffRole.role_id == Role.id)
        .filter(StaffRole.staff_id == staff_id)
        .all()
    )
    return [r[0] for r in rows]


def _staff_to_out(db: Session, staff: StaffAccount) -> StaffOut:
    roles = get_staff_role_names(db, staff.id)
    return StaffOut(
        id=staff.id,
        email=staff.email,
        name=staff.name,
        is_active=staff.is_active,
        mfa_enabled=staff.mfa_enabled,
        created_at=staff.created_at,
        roles=roles,
    )


@router.get("/staff", response_model=list[StaffOut])
def list_staff(
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner")),
):
    staff_list = db.query(StaffAccount).all()
    return [_staff_to_out(db, s) for s in staff_list]


@router.post("/staff", response_model=StaffOut)
def create_staff(
    body: StaffCreate,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner")),
):
    existing = db.query(StaffAccount).filter(StaffAccount.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    staff = StaffAccount(
        email=body.email,
        name=body.name,
        hashed_password=hash_password(body.password),
    )
    db.add(staff)
    db.flush()
    for role_name in body.role_names or []:
        role = db.query(Role).filter(Role.name == role_name).first()
        if role:
            sr = StaffRole(staff_id=staff.id, role_id=role.id)
            db.add(sr)
    db.commit()
    db.refresh(staff)
    return _staff_to_out(db, staff)


@router.put("/staff/{staff_id}", response_model=StaffOut)
def update_staff(
    staff_id: str,
    body: StaffUpdate,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner")),
):
    staff = db.query(StaffAccount).filter(StaffAccount.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    if body.name is not None:
        staff.name = body.name
    if body.is_active is not None:
        staff.is_active = body.is_active
    if body.mfa_enabled is not None:
        staff.mfa_enabled = body.mfa_enabled
    if body.role_names is not None:
        db.query(StaffRole).filter(StaffRole.staff_id == staff_id).delete()
        for role_name in body.role_names:
            role = db.query(Role).filter(Role.name == role_name).first()
            if role:
                db.add(StaffRole(staff_id=staff_id, role_id=role.id))
    db.commit()
    db.refresh(staff)
    return _staff_to_out(db, staff)


@router.delete("/staff/{staff_id}")
def deactivate_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current=Depends(require_role("admin", "owner")),
):
    if current.id == staff_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    staff = db.query(StaffAccount).filter(StaffAccount.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    staff.is_active = False
    db.commit()
    return {"message": "Staff deactivated", "staff_id": staff_id}


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


@router.get("/api-keys", response_model=list[ApiKeyOut])
def list_api_keys(
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner")),
):
    keys = (
        db.query(ApiKey)
        .filter(ApiKey.revoked_at.is_(None))
        .order_by(ApiKey.created_at.desc())
        .all()
    )
    return [ApiKeyOut.model_validate(k) for k in keys]


@router.post("/api-keys")
def create_api_key(
    body: ApiKeyCreate,
    db: Session = Depends(get_db),
    staff=Depends(require_role("admin", "owner")),
):
    raw_key = f"avfx_{secrets.token_urlsafe(32)}"
    key_hash = _hash_key(raw_key)
    expires_at = None
    if body.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)
    api_key = ApiKey(
        name=body.name,
        key_hash=key_hash,
        scopes=body.scopes or [],
        created_by=staff.id,
        expires_at=expires_at,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": raw_key,
        "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
        "warning": "Store the key securely; it will not be shown again.",
    }


@router.delete("/api-keys/{key_id}")
def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner")),
):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "API key revoked", "key_id": key_id}
