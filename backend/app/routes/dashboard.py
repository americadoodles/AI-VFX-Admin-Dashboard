from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import get_current_staff, require_role
from app.models.models import (
    User,
    GenerationJob,
    TokenTransaction,
    TokenWallet,
    EventLog,
)
from app.schemas.schemas import (
    KPIDashboardResponse,
    TrendData,
    IncidentOut,
    QueueHealthResponse,
)

router = APIRouter(prefix="/admin/dashboard", tags=["dashboard"])


@router.get("/kpis", response_model=KPIDashboardResponse)
def get_kpis(
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(days=1)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users_24h = (
        db.query(func.count(User.id))
        .filter(User.last_login >= day_ago)
        .scalar()
        or 0
    )
    total_generations = db.query(func.count(GenerationJob.id)).scalar() or 0
    generations_today = (
        db.query(func.count(GenerationJob.id))
        .filter(GenerationJob.created_at >= today_start)
        .scalar()
        or 0
    )
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
    failed_24h = (
        db.query(func.count(GenerationJob.id))
        .filter(
            GenerationJob.status == "failed",
            GenerationJob.created_at >= day_ago,
        )
        .scalar()
        or 0
    )
    # Compute average latency from started_at → completed_at
    avg_latency = (
        db.query(
            func.avg(
                extract("epoch", GenerationJob.completed_at)
                - extract("epoch", GenerationJob.started_at)
            )
            * 1000
        )
        .filter(
            GenerationJob.completed_at.isnot(None),
            GenerationJob.started_at.isnot(None),
        )
        .scalar()
    )

    return KPIDashboardResponse(
        total_users=total_users,
        active_users_24h=active_users_24h,
        total_generations=total_generations,
        generations_today=generations_today,
        total_tokens_issued=int(total_issued),
        total_tokens_consumed=int(total_consumed),
        failed_jobs_24h=int(failed_24h),
        avg_latency_ms=float(avg_latency) if avg_latency else None,
    )


@router.get("/trends")
def get_trends(
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    now = datetime.now(timezone.utc)
    result = []
    for i in range(days):
        d = (now - timedelta(days=days - 1 - i)).date()
        start = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        count = (
            db.query(func.count(GenerationJob.id))
            .filter(
                GenerationJob.created_at >= start,
                GenerationJob.created_at < end,
            )
            .scalar()
            or 0
        )
        result.append({"date": d.isoformat(), "value": count, "label": "generations"})
    return {"trends": result}


@router.get("/incidents", response_model=list[IncidentOut])
def get_incidents(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    jobs = (
        db.query(GenerationJob)
        .filter(GenerationJob.status == "failed")
        .order_by(GenerationJob.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        IncidentOut(
            id=j.id,
            job_id=j.id,
            error_summary=(j.error_message or "Unknown error")[:200],
            created_at=j.created_at,
        )
        for j in jobs
    ]


@router.get("/queue-health", response_model=QueueHealthResponse)
def get_queue_health(
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    status_counts = (
        db.query(GenerationJob.status, func.count(GenerationJob.id))
        .group_by(GenerationJob.status)
        .all()
    )
    by_status = dict(status_counts)
    return QueueHealthResponse(
        pending=by_status.get("pending", 0),
        running=by_status.get("running", 0),
        processing=by_status.get("processing", 0),
        completed=by_status.get("completed", 0),
        failed=by_status.get("failed", 0),
        cancelled=by_status.get("cancelled", 0),
    )
