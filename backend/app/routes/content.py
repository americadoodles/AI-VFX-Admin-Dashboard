from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_role
from app.models.models import MediaAsset
from app.schemas.schemas import MediaAssetOut, StorageUsageOut

router = APIRouter(prefix="/admin", tags=["content"])


@router.get("/assets")
def list_assets(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    kind: Optional[str] = None,
    source: Optional[str] = None,
    flagged: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    q = db.query(MediaAsset)
    if user_id:
        q = q.filter(MediaAsset.user_id == user_id)
    if project_id:
        q = q.filter(MediaAsset.project_id == project_id)
    if kind:
        q = q.filter(MediaAsset.kind == kind)
    if source:
        q = q.filter(MediaAsset.source == source)
    if flagged is not None:
        q = q.filter(MediaAsset.flagged == flagged)
    if search:
        q = q.filter(MediaAsset.filename.ilike(f"%{search}%"))
    total = q.count()
    items = (
        q.order_by(MediaAsset.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {
        "items": [MediaAssetOut.model_validate(a) for a in items],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/storage/usage")
def storage_usage(
    group_by: str = Query("user", description="user or project"),
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    if group_by == "project":
        rows = (
            db.query(
                MediaAsset.project_id,
                func.coalesce(func.sum(MediaAsset.size_bytes), 0).label("total_bytes"),
                func.count(MediaAsset.id).label("asset_count"),
            )
            .filter(MediaAsset.project_id.isnot(None))
            .group_by(MediaAsset.project_id)
            .all()
        )
        return [
            StorageUsageOut(
                project_id=p_id,
                total_bytes=int(total_bytes),
                asset_count=asset_count,
            )
            for p_id, total_bytes, asset_count in rows
        ]
    else:
        rows = (
            db.query(
                MediaAsset.user_id,
                func.coalesce(func.sum(MediaAsset.size_bytes), 0).label("total_bytes"),
                func.count(MediaAsset.id).label("asset_count"),
            )
            .group_by(MediaAsset.user_id)
            .all()
        )
        return [
            StorageUsageOut(
                user_id=u_id,
                total_bytes=int(total_bytes),
                asset_count=asset_count,
            )
            for u_id, total_bytes, asset_count in rows
        ]


@router.post("/assets/{asset_id}/flag")
def flag_asset(
    asset_id: str,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops")),
):
    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset.flagged = True
    asset.flag_reason = reason
    db.commit()
    return {"message": "Asset flagged", "asset_id": asset_id}
