from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import create_access_token, get_current_staff, require_role
from app.models.models import User, Session as UserSession, TokenWallet, GenerationJob
from app.schemas.schemas import (
    UserOut,
    UserListResponse,
    UserSuspendRequest,
)
from app.services.audit import create_audit_log

router = APIRouter(prefix="/admin/users", tags=["users"])


def _user_to_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        email=u.email,
        name=u.name,
        status=u.status,
        created_at=u.created_at,
        last_login_at=u.last_login_at,
        org_id=u.org_id,
        mfa_enabled=u.mfa_enabled,
        verified_at=u.verified_at,
        linked_providers=u.linked_providers or [],
        plan=u.plan,
        storage_used_bytes=u.storage_used_bytes or 0,
    )


@router.get("", response_model=UserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    plan: Optional[str] = None,
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "support", "ops")),
):
    q = db.query(User).filter(User.status != "deleted")
    if search:
        q = q.filter(
            or_(
                User.email.ilike(f"%{search}%"),
                User.name.ilike(f"%{search}%"),
            )
        )
    if status_filter:
        q = q.filter(User.status == status_filter)
    if plan:
        q = q.filter(User.plan == plan)
    total = q.count()
    order_col = getattr(User, sort, User.created_at)
    if order == "asc":
        q = q.order_by(order_col.asc())
    else:
        q = q.order_by(order_col.desc())
    items = q.offset((page - 1) * limit).limit(limit).all()
    return UserListResponse(
        items=[_user_to_out(u) for u in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{user_id}", response_model=dict)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "support", "ops")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status == "deleted":
        raise HTTPException(status_code=404, detail="User not found")
    wallet = db.query(TokenWallet).filter(TokenWallet.user_id == user_id).first()
    balance = wallet.balance if wallet else 0
    project_count = 0
    gen_count = (
        db.query(func.count(GenerationJob.id))
        .filter(GenerationJob.user_id == user_id)
        .scalar()
        or 0
    )
    return {
        "user": _user_to_out(user),
        "token_balance": balance,
        "project_count": project_count,
        "generation_count": gen_count,
    }


@router.post("/{user_id}/suspend")
def suspend_user(
    user_id: str,
    body: UserSuspendRequest,
    request: Request,
    db: Session = Depends(get_db),
    staff=Depends(require_role("admin", "owner")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status == "deleted":
        raise HTTPException(status_code=404, detail="User not found")
    if user.status == "suspended":
        raise HTTPException(status_code=400, detail="User already suspended")
    before = {"status": user.status}
    user.status = "suspended"
    db.commit()
    create_audit_log(
        db,
        actor_id=staff.id,
        action="user.suspend",
        target_type="user",
        target_id=user_id,
        before_json=before,
        after_json={"status": "suspended", "reason": body.reason},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return {"message": "User suspended", "user_id": user_id}


@router.post("/{user_id}/unsuspend")
def unsuspend_user(
    user_id: str,
    body: UserSuspendRequest,
    request: Request,
    db: Session = Depends(get_db),
    staff=Depends(require_role("admin", "owner")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status == "deleted":
        raise HTTPException(status_code=404, detail="User not found")
    if user.status != "suspended":
        raise HTTPException(status_code=400, detail="User is not suspended")
    before = {"status": user.status}
    user.status = "active"
    db.commit()
    create_audit_log(
        db,
        actor_id=staff.id,
        action="user.unsuspend",
        target_type="user",
        target_id=user_id,
        before_json=before,
        after_json={"status": "active", "reason": body.reason},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return {"message": "User unsuspended", "user_id": user_id}


@router.post("/{user_id}/reset-mfa")
def reset_mfa(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    staff=Depends(require_role("admin", "owner")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status == "deleted":
        raise HTTPException(status_code=404, detail="User not found")
    before = {"mfa_enabled": user.mfa_enabled}
    user.mfa_enabled = False
    db.commit()
    create_audit_log(
        db,
        actor_id=staff.id,
        action="user.reset_mfa",
        target_type="user",
        target_id=user_id,
        before_json=before,
        after_json={"mfa_enabled": False},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return {"message": "MFA reset", "user_id": user_id}


@router.post("/{user_id}/revoke-sessions")
def revoke_sessions(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    staff=Depends(require_role("admin", "owner")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status == "deleted":
        raise HTTPException(status_code=404, detail="User not found")
    now = datetime.now(timezone.utc)
    db.query(UserSession).filter(
        UserSession.user_id == user_id,
        UserSession.revoked_at.is_(None),
    ).update({UserSession.revoked_at: now})
    db.commit()
    create_audit_log(
        db,
        actor_id=staff.id,
        action="user.revoke_sessions",
        target_type="user",
        target_id=user_id,
        after_json={"revoked_at": now.isoformat()},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return {"message": "All sessions revoked", "user_id": user_id}


@router.post("/{user_id}/impersonate")
def impersonate(
    user_id: str,
    db: Session = Depends(get_db),
    staff=Depends(require_role("admin", "owner")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status == "deleted":
        raise HTTPException(status_code=404, detail="User not found")
    token = create_access_token(
        data={"sub": user.id, "impersonation": True, "staff_id": staff.id},
        expires_delta=timedelta(minutes=60),
    )
    return {"access_token": token, "token_type": "bearer", "user_id": user_id}


@router.get("/{user_id}/export")
def export_user(
    user_id: str,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status == "deleted":
        raise HTTPException(status_code=404, detail="User not found")
    return {"export_url": f"/admin/exports/user/{user_id}.json", "expires_in": 3600}


@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    staff=Depends(require_role("admin", "owner")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status == "deleted":
        raise HTTPException(status_code=404, detail="User not found")
    before = {"status": user.status}
    user.status = "deleted"
    db.commit()
    create_audit_log(
        db,
        actor_id=staff.id,
        action="user.delete",
        target_type="user",
        target_id=user_id,
        before_json=before,
        after_json={"status": "deleted"},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return {"message": "User deleted", "user_id": user_id}
