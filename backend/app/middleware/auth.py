from datetime import datetime, timedelta, timezone
from typing import Callable, List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import Role, StaffAccount, StaffRole

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
    step_up: bool = False,
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    if step_up:
        to_encode["step_up"] = True
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_staff_by_id(db: Session, staff_id: str) -> StaffAccount | None:
    return db.query(StaffAccount).filter(StaffAccount.id == staff_id).first()


def get_staff_role_names(db: Session, staff_id: str) -> List[str]:
    rows = (
        db.query(Role.name)
        .join(StaffRole, StaffRole.role_id == Role.id)
        .filter(StaffRole.staff_id == staff_id)
        .all()
    )
    return [r[0] for r in rows]


def get_current_staff(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> StaffAccount:
    payload = verify_token(credentials.credentials)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    staff = get_staff_by_id(db, sub)
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Staff account not found",
        )
    if not staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff account is inactive",
        )
    return staff


def require_role(*allowed_roles: str) -> Callable:
    def _check(
        staff: StaffAccount = Depends(get_current_staff),
        db: Session = Depends(get_db),
    ) -> StaffAccount:
        role_names = get_staff_role_names(db, staff.id)
        if not any(r in allowed_roles for r in role_names):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return staff

    return _check


def step_up_auth_required(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    payload = verify_token(credentials.credentials)
    if not payload.get("step_up"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Step-up authentication required",
        )
    return payload


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
