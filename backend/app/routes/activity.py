from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, extract, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_role
from app.models.models import AuditLog, EventLog, GeneratedImage, GenerationJob
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


def _job_to_out(j: GenerationJob) -> GenerationJobOut:
    """Convert a GenerationJob row to the API response, computing duration_ms."""
    duration_ms = None
    if j.started_at and j.completed_at:
        delta = j.completed_at - j.started_at
        duration_ms = int(delta.total_seconds() * 1000)
    return GenerationJobOut(
        id=j.id,
        user_id=j.user_id,
        session_id=j.session_id,
        name=j.name,
        status=j.status,
        model_used=j.model_used or "DALL-E",
        prompt=j.prompt,
        generated_prompt=j.generated_prompt,
        shot_type=j.shot_type,
        camera_angle=j.camera_angle,
        style=j.style,
        aspect_ratio=j.aspect_ratio,
        is_visible=j.is_visible if j.is_visible is not None else True,
        duration_ms=duration_ms,
        started_at=j.started_at,
        completed_at=j.completed_at,
        created_at=j.created_at,
    )


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
    if total > 0:
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

    # Fallback: synthesize activity from shared generation jobs when event_logs is empty.
    jobs_q = db.query(GenerationJob)

    if user_id:
        try:
            jobs_q = jobs_q.filter(GenerationJob.user_id == int(user_id))
        except ValueError:
            return EventLogResponse(items=[], total=0, page=page, limit=limit)

    if type_filter == "generation_start":
        jobs_q = jobs_q.filter(GenerationJob.status.in_(["pending", "processing", "running"]))
    elif type_filter == "generation_complete":
        jobs_q = jobs_q.filter(GenerationJob.status.in_(["completed", "success"]))
    elif type_filter:
        # Unknown type filter for fallback source.
        return EventLogResponse(items=[], total=0, page=page, limit=limit)

    if search:
        like = f"%{search}%"
        jobs_q = jobs_q.filter(
            or_(
                GenerationJob.name.ilike(like),
                GenerationJob.prompt.ilike(like),
                GenerationJob.model_used.ilike(like),
                GenerationJob.status.ilike(like),
            )
        )

    jobs_total = jobs_q.count()
    jobs = (
        jobs_q.order_by(GenerationJob.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    synthesized_items = []
    for job in jobs:
        status = (job.status or "").lower()
        event_type = "generation_complete" if status in {"completed", "success"} else "generation_start"
        synthesized_items.append(
            EventLogOut(
                id=f"gen-job-{job.id}",
                type=event_type,
                user_id=str(job.user_id) if job.user_id is not None else None,
                org_id=None,
                project_id=str(job.session.project_id) if job.session and job.session.project_id is not None else None,
                shot_id=str(job.id),
                payload_json={
                    "job_id": job.id,
                    "status": job.status,
                    "model": job.model_used,
                    "prompt": job.prompt,
                },
                created_at=job.created_at,
            )
        )

    return EventLogResponse(
        items=synthesized_items,
        total=jobs_total,
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
    user_id: Optional[int] = None,
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
        q = q.filter(GenerationJob.model_used.ilike(f"%{model}%"))
    total = q.count()
    items = (
        q.order_by(GenerationJob.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return GenerationJobListResponse(
        items=[_job_to_out(j) for j in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/generation-jobs/{job_id}", response_model=GenerationJobDetailOut)
def get_generation_job(
    job_id: int,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    duration_ms = None
    if job.started_at and job.completed_at:
        delta = job.completed_at - job.started_at
        duration_ms = int(delta.total_seconds() * 1000)

    generated_image_count = (
        db.query(func.count(GeneratedImage.id))
        .filter(GeneratedImage.generation_job_id == job.id)
        .scalar()
        or 0
    )

    return GenerationJobDetailOut(
        id=job.id,
        user_id=job.user_id,
        session_id=job.session_id,
        name=job.name,
        status=job.status,
        model_used=job.model_used or "DALL-E",
        prompt=job.prompt,
        generated_prompt=job.generated_prompt,
        shot_type=job.shot_type,
        camera_angle=job.camera_angle,
        style=job.style,
        aspect_ratio=job.aspect_ratio,
        is_visible=job.is_visible if job.is_visible is not None else True,
        duration_ms=duration_ms,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
        location=job.location,
        lighting=job.lighting,
        weather=job.weather,
        is_custom_enabled=job.is_custom_enabled or False,
        number_of_shots=job.number_of_shots or 1,
        error_message=job.error_message,
        generation_method=job.generation_method,
        sort_order=job.sort_order or 0,
        subject_action=job.subject_action,
        custom_idea=job.custom_idea,
        suggested_prompt=job.suggested_prompt,
        parent_shot_id=job.parent_shot_id,
        version_number=job.version_number or 1,
        generated_image_count=generated_image_count,
    )


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
        db.query(GenerationJob.model_used, func.count(GenerationJob.id))
        .filter(GenerationJob.status == "failed")
        .group_by(GenerationJob.model_used)
        .all()
    )
    return {
        "total_failed": total_failed,
        "by_model": [{"model": m, "count": c} for m, c in by_model],
    }
