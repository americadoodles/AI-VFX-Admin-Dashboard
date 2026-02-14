from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_role
from app.models.models import AuditLog, EventLog, GenerationJob
from app.schemas.schemas import (
    AuditLogOut,
    AuditLogResponse,
    EventLogOut,
    EventLogResponse,
    GenerationJobOut,
    GenerationJobDetailOut,
    GenerationJobListResponse,
)

router = APIRouter(prefix="/admin", tags=["activity"])


@router.get("/events", response_model=EventLogResponse)
def list_events(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type_filter: Optional[str] = Query(None, alias="type"),
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    q = db.query(EventLog)
    if type_filter:
        q = q.filter(EventLog.type == type_filter)
    if user_id:
        q = q.filter(EventLog.user_id == user_id)
    if search:
        q = q.filter(EventLog.type.ilike(f"%{search}%"))
    total = q.count()
    items = (
        q.order_by(EventLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return EventLogResponse(
        items=[EventLogOut.model_validate(e) for e in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/audit-logs", response_model=AuditLogResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    actor_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner")),
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    if target_type:
        q = q.filter(AuditLog.target_type == target_type)
    if actor_id:
        q = q.filter(AuditLog.actor_id == actor_id)
    total = q.count()
    items = (
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return AuditLogResponse(
        items=[AuditLogOut.model_validate(a) for a in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/generation-jobs", response_model=GenerationJobListResponse)
def list_generation_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    user_id: Optional[str] = None,
    model: Optional[str] = None,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    q = db.query(GenerationJob)
    if status:
        q = q.filter(GenerationJob.status == status)
    if user_id:
        q = q.filter(GenerationJob.user_id == user_id)
    if model:
        q = q.filter(GenerationJob.model.ilike(f"%{model}%"))
    total = q.count()
    items = (
        q.order_by(GenerationJob.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return GenerationJobListResponse(
        items=[GenerationJobOut.model_validate(j) for j in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/generation-jobs/{job_id}", response_model=GenerationJobDetailOut)
def get_generation_job(
    job_id: str,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return GenerationJobDetailOut.model_validate(job)


@router.get("/errors/dashboard")
def errors_dashboard(
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    total_failed = (
        db.query(func.count(GenerationJob.id))
        .filter(GenerationJob.status == "failed")
        .scalar()
        or 0
    )
    by_model = (
        db.query(GenerationJob.model, func.count(GenerationJob.id))
        .filter(GenerationJob.status == "failed")
        .group_by(GenerationJob.model)
        .all()
    )
    return {
        "total_failed": total_failed,
        "by_model": [{"model": m, "count": c} for m, c in by_model],
    }
