from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.middleware.auth import (
    create_access_token,
    get_current_staff,
    hash_password,
    verify_password,
)
from app.models.models import StaffAccount
from app.schemas.schemas import LoginRequest, TokenResponse, StaffOut

router = APIRouter(prefix="/admin/auth", tags=["auth"])


def _staff_role_names(db: Session, staff_id: str) -> list:
    from app.models.models import Role, StaffRole
    rows = (
        db.query(Role.name)
        .join(StaffRole, StaffRole.role_id == Role.id)
        .filter(StaffRole.staff_id == staff_id)
        .all()
    )
    return [r[0] for r in rows]


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    staff = db.query(StaffAccount).filter(StaffAccount.email == data.email).first()
    if not staff or not verify_password(data.password, staff.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )
    token = create_access_token(data={"sub": staff.id})
    return TokenResponse(
        access_token=token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
def logout():
    return {"message": "Logged out"}


@router.get("/me", response_model=StaffOut)
def me(
    staff: StaffAccount = Depends(get_current_staff),
    db: Session = Depends(get_db),
):
    role_names = _staff_role_names(db, staff.id)
    return StaffOut(
        id=staff.id,
        email=staff.email,
        name=staff.name,
        is_active=staff.is_active,
        mfa_enabled=staff.mfa_enabled,
        created_at=staff.created_at,
        roles=role_names,
    )
