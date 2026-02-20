from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_role
from app.models.models import FeatureFlag, GenerationJob, ModelConfig
from app.schemas.schemas import (
    ModelConfigOut,
    ModelConfigUpdate,
    FeatureFlagOut,
    FeatureFlagUpdate,
    SystemBannerRequest,
    MaintenanceModeRequest,
)

router = APIRouter(prefix="/admin", tags=["system"])

# In-memory system state (no DB table specified for banner/maintenance)
_system_banner: Optional[dict] = None
_maintenance_mode: Optional[dict] = None


@router.get("/models", response_model=list[ModelConfigOut])
def list_models(
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    return db.query(ModelConfig).all()


@router.put("/models/{model_id}", response_model=ModelConfigOut)
def update_model(
    model_id: str,
    body: ModelConfigUpdate,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner")),
):
    model = db.query(ModelConfig).filter(ModelConfig.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    if body.enabled is not None:
        model.enabled = body.enabled
    if body.token_cost is not None:
        model.token_cost = body.token_cost
    if body.concurrency_limit is not None:
        model.concurrency_limit = body.concurrency_limit
    db.commit()
    db.refresh(model)
    return model


@router.get("/feature-flags", response_model=list[FeatureFlagOut])
def list_feature_flags(
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "viewer")),
):
    return db.query(FeatureFlag).all()


@router.put("/feature-flags/{flag_id}", response_model=FeatureFlagOut)
def update_feature_flag(
    flag_id: str,
    body: FeatureFlagUpdate,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner")),
):
    flag = db.query(FeatureFlag).filter(FeatureFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    if body.enabled is not None:
        flag.enabled = body.enabled
    if body.rollout_percent is not None:
        flag.rollout_percent = body.rollout_percent
    if body.description is not None:
        flag.description = body.description
    db.commit()
    db.refresh(flag)
    return flag


@router.put("/system/incident-banner")
def set_incident_banner(
    body: SystemBannerRequest,
    _staff=Depends(require_role("admin", "owner")),
):
    global _system_banner
    if body.message is None and body.severity is None:
        _system_banner = None
        return {"message": "Banner cleared"}
    _system_banner = {
        "message": body.message or "",
        "severity": body.severity or "info",
    }
    return {"message": "Banner updated", "banner": _system_banner}


@router.get("/system/incident-banner")
def get_incident_banner(
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    return {"banner": _system_banner}


@router.put("/system/maintenance-mode")
def set_maintenance_mode(
    body: MaintenanceModeRequest,
    _staff=Depends(require_role("admin", "owner")),
):
    global _maintenance_mode
    _maintenance_mode = {
        "enabled": body.enabled,
        "message": body.message or "",
    }
    return {"message": "Maintenance mode updated", "maintenance": _maintenance_mode}


@router.post("/generation-jobs/{job_id}/retry")
def retry_job(
    job_id: int,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops")),
):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "failed":
        raise HTTPException(status_code=400, detail="Only failed jobs can be retried")
    job.status = "pending"
    job.error_message = None
    job.completed_at = None
    db.commit()
    return {"message": "Job queued for retry", "job_id": job_id}


@router.post("/generation-jobs/{job_id}/cancel")
def cancel_job(
    job_id: int,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops")),
):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in ("pending", "running", "processing"):
        raise HTTPException(
            status_code=400,
            detail="Only pending, running, or processing jobs can be cancelled",
        )
    job.status = "cancelled"
    job.completed_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Job cancelled", "job_id": job_id}
