from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import create_access_token, get_current_staff, require_role
from app.models.models import (
    AdminUserOverride,
    GenerationJob,
    OAuthAccount,
    Project,
    TokenWallet,
    User,
)
from app.schemas.schemas import (
    UserOut,
    UserListResponse,
    UserSuspendRequest,
)
from app.services.audit import create_audit_log

router = APIRouter(prefix="/admin/users", tags=["users"])


def _user_to_out(db: Session, u: User) -> UserOut:
    """Convert a shared User row + admin overlay into the API response."""
    override = (
        db.query(AdminUserOverride)
        .filter(AdminUserOverride.user_id == u.id)
        .first()
    )
    # Gather linked OAuth providers
    oauth_providers = [
        row[0]
        for row in db.query(OAuthAccount.provider)
        .filter(OAuthAccount.user_id == u.id)
        .all()
    ]
    return UserOut(
        id=u.id,
        email=u.email,
        username=u.username,
        auth_provider=u.auth_provider or "email",
        avatar_url=u.avatar_url,
        is_confirmed=u.is_confirmed or False,
        is_suspended=override.is_suspended if override else False,
        last_login=u.last_login,
        created_at=u.created_at,
        updated_at=u.updated_at,
        plan=override.plan if override else "free",
        oauth_providers=oauth_providers,
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
    q = db.query(User)

    if search:
        q = q.filter(
            or_(
                User.email.ilike(f"%{search}%"),
                User.username.ilike(f"%{search}%"),
            )
        )

    # Filter by suspension status via admin overlay
    if status_filter == "suspended":
        q = q.join(AdminUserOverride).filter(AdminUserOverride.is_suspended == True)
    elif status_filter == "active":
        q = q.outerjoin(AdminUserOverride).filter(
            or_(
                AdminUserOverride.is_suspended == False,
                AdminUserOverride.user_id.is_(None),
            )
        )

    if plan:
        q = q.join(
            AdminUserOverride, AdminUserOverride.user_id == User.id
        ).filter(AdminUserOverride.plan == plan)

    total = q.count()

    # Sorting
    order_col = getattr(User, sort, User.created_at)
    if order == "asc":
        q = q.order_by(order_col.asc())
    else:
        q = q.order_by(order_col.desc())

    items = q.offset((page - 1) * limit).limit(limit).all()
    return UserListResponse(
        items=[_user_to_out(db, u) for u in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{user_id}", response_model=dict)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "support", "ops")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    wallet = db.query(TokenWallet).filter(TokenWallet.user_id == user_id).first()
    balance = wallet.balance if wallet else 0

    project_count = (
        db.query(func.count(Project.id))
        .filter(Project.user_id == user_id)
        .scalar()
        or 0
    )
    gen_count = (
        db.query(func.count(GenerationJob.id))
        .filter(GenerationJob.user_id == user_id)
        .scalar()
        or 0
    )
    return {
        "user": _user_to_out(db, user),
        "token_balance": balance,
        "project_count": project_count,
        "generation_count": gen_count,
    }


@router.post("/{user_id}/suspend")
def suspend_user(
    user_id: int,
    body: UserSuspendRequest,
    request: Request,
    db: Session = Depends(get_db),
    staff=Depends(require_role("admin", "owner")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    override = (
        db.query(AdminUserOverride)
        .filter(AdminUserOverride.user_id == user_id)
        .first()
    )
    if override and override.is_suspended:
        raise HTTPException(status_code=400, detail="User already suspended")

    now = datetime.now(timezone.utc)
    if not override:
        override = AdminUserOverride(user_id=user_id)
        db.add(override)
    override.is_suspended = True
    override.suspended_at = now
    override.suspended_reason = body.reason
    db.commit()

    create_audit_log(
        db,
        actor_id=staff.id,
        action="user.suspend",
        target_type="user",
        target_id=str(user_id),
        before_json={"is_suspended": False},
        after_json={"is_suspended": True, "reason": body.reason},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return {"message": "User suspended", "user_id": user_id}


@router.post("/{user_id}/unsuspend")
def unsuspend_user(
    user_id: int,
    body: UserSuspendRequest,
    request: Request,
    db: Session = Depends(get_db),
    staff=Depends(require_role("admin", "owner")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    override = (
        db.query(AdminUserOverride)
        .filter(AdminUserOverride.user_id == user_id)
        .first()
    )
    if not override or not override.is_suspended:
        raise HTTPException(status_code=400, detail="User is not suspended")

    override.is_suspended = False
    override.suspended_at = None
    override.suspended_reason = None
    db.commit()

    create_audit_log(
        db,
        actor_id=staff.id,
        action="user.unsuspend",
        target_type="user",
        target_id=str(user_id),
        before_json={"is_suspended": True},
        after_json={"is_suspended": False, "reason": body.reason},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return {"message": "User unsuspended", "user_id": user_id}


@router.post("/{user_id}/impersonate")
def impersonate(
    user_id: int,
    db: Session = Depends(get_db),
    staff=Depends(require_role("admin", "owner")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    token = create_access_token(
        data={"sub": str(user.id), "impersonation": True, "staff_id": staff.id},
        expires_delta=timedelta(minutes=60),
    )
    return {"access_token": token, "token_type": "bearer", "user_id": user_id}


@router.get("/{user_id}/export")
def export_user(
    user_id: int,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"export_url": f"/admin/exports/user/{user_id}.json", "expires_in": 3600}
