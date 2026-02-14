from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_staff, require_role
from app.models.models import TokenTransaction, TokenWallet, User
from app.schemas.schemas import (
    TokenTransactionOut,
    TokenLedgerResponse,
    TokenGrantRequest,
    TokenDashboardResponse,
)
from app.services.audit import create_audit_log

router = APIRouter(prefix="/admin/tokens", tags=["tokens"])


@router.get("/dashboard", response_model=TokenDashboardResponse)
def token_dashboard(
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "billing", "viewer")),
):
    total_issued = (
        db.query(func.coalesce(func.sum(TokenTransaction.amount), 0))
        .filter(TokenTransaction.amount > 0)
        .scalar()
        or 0
    )
    total_consumed = abs(
        db.query(func.coalesce(func.sum(TokenTransaction.amount), 0))
        .filter(TokenTransaction.amount < 0)
        .scalar()
        or 0
    )
    outstanding = (
        db.query(func.coalesce(func.sum(TokenWallet.balance), 0)).scalar() or 0
    )
    now = datetime.now(timezone.utc)
    daily_trend = []
    for i in range(7):
        d = (now - timedelta(days=6 - i)).date()
        start = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        issued = (
            db.query(func.coalesce(func.sum(TokenTransaction.amount), 0))
            .filter(
                TokenTransaction.amount > 0,
                TokenTransaction.created_at >= start,
                TokenTransaction.created_at < end,
            )
            .scalar()
            or 0
        )
        consumed = abs(
            db.query(func.coalesce(func.sum(TokenTransaction.amount), 0))
            .filter(
                TokenTransaction.amount < 0,
                TokenTransaction.created_at >= start,
                TokenTransaction.created_at < end,
            )
            .scalar()
            or 0
        )
        daily_trend.append({
            "date": d.isoformat(),
            "issued": int(issued),
            "consumed": int(consumed),
        })
    return TokenDashboardResponse(
        total_issued=int(total_issued),
        total_consumed=int(total_consumed),
        outstanding_balance=int(outstanding),
        daily_trend=daily_trend,
    )


@router.get("/ledger", response_model=TokenLedgerResponse)
def token_ledger(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = None,
    type_filter: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "billing", "viewer")),
):
    q = db.query(TokenTransaction)
    if user_id:
        q = q.filter(TokenTransaction.user_id == user_id)
    if type_filter:
        q = q.filter(TokenTransaction.type == type_filter)
    total = q.count()
    items = (
        q.order_by(TokenTransaction.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return TokenLedgerResponse(
        items=[TokenTransactionOut.model_validate(t) for t in items],
        total=total,
        page=page,
        limit=limit,
    )


def _grant_tokens(
    db: Session,
    user_id: str,
    amount: int,
    reason: str,
    created_by_admin_id: str,
    request: Request,
) -> None:
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status == "deleted":
        raise HTTPException(status_code=404, detail="User not found")
    wallet = db.query(TokenWallet).filter(TokenWallet.user_id == user_id).first()
    if not wallet:
        wallet = TokenWallet(user_id=user_id, balance=0)
        db.add(wallet)
        db.flush()
    wallet.balance = (wallet.balance or 0) + amount
    tx = TokenTransaction(
        user_id=user_id,
        amount=amount,
        type="credit_grant",
        reason=reason,
        created_by_admin_id=created_by_admin_id,
    )
    db.add(tx)
    db.commit()
    create_audit_log(
        db,
        actor_id=created_by_admin_id,
        action="tokens.grant",
        target_type="user",
        target_id=user_id,
        after_json={"amount": amount, "reason": reason},
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


# Mounted under /admin/users/{user_id}/tokens in main.py or nested router
# We expose them here as separate router that expects user_id in path.
# So we'll add a sub-router or include these in users. Spec says:
# "Plus under /admin/users/{user_id}/tokens: GET /, POST /grant"
# So we need routes: GET /admin/users/{user_id}/tokens, POST /admin/users/{user_id}/tokens/grant
# We can define them in tokens.py with prefix "" and include with prefix /admin/users/{user_id}/tokens
# But that would require dynamic prefix. Easier: define in users.py or tokens.py with path including {user_id}.
# I'll add them to tokens.py with a router that has prefix "" and we include it in main with prefix "/admin/users/{user_id}/tokens" - that won't work because user_id is path param.
# So in main we include router with prefix="/admin/users" and in tokens we have a second router with prefix="" and path like /{user_id}/tokens. So in tokens.py we define:
# router_users_tokens = APIRouter(prefix="/admin/users", tags=["user-tokens"])
# @router_users_tokens.get("/{user_id}/tokens") and @router_users_tokens.post("/{user_id}/tokens/grant")
# Then include router_users_tokens in main. So I'll add these to tokens.py as another router and include both.
user_tokens_router = APIRouter(prefix="/admin/users", tags=["user-tokens"])


@user_tokens_router.get("/{user_id}/tokens")
def get_user_tokens(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "billing", "support")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status == "deleted":
        raise HTTPException(status_code=404, detail="User not found")
    wallet = db.query(TokenWallet).filter(TokenWallet.user_id == user_id).first()
    balance = wallet.balance if wallet else 0
    tx_query = (
        db.query(TokenTransaction)
        .filter(TokenTransaction.user_id == user_id)
        .order_by(TokenTransaction.created_at.desc())
    )
    total = tx_query.count()
    transactions = tx_query.offset((page - 1) * limit).limit(limit).all()
    return {
        "user_id": user_id,
        "balance": balance,
        "transactions": [TokenTransactionOut.model_validate(t) for t in transactions],
        "total_transactions": total,
        "page": page,
        "limit": limit,
    }


@user_tokens_router.post("/{user_id}/tokens/grant")
def grant_user_tokens(
    user_id: str,
    body: TokenGrantRequest,
    request: Request,
    db: Session = Depends(get_db),
    staff=Depends(require_role("admin", "owner", "billing")),
):
    _grant_tokens(db, user_id, body.amount, body.reason, staff.id, request)
    wallet = db.query(TokenWallet).filter(TokenWallet.user_id == user_id).first()
    return {
        "message": "Tokens granted",
        "user_id": user_id,
        "amount": body.amount,
        "new_balance": wallet.balance if wallet else 0,
    }
