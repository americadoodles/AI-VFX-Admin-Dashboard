"""Content & Storage routes.

Replaced the admin-specific MediaAsset model with queries against the shared
reference_images and generated_images tables from the production database.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, literal, union_all
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth import require_role
from app.models.models import GeneratedImage, ReferenceImage
from app.schemas.schemas import ImageAssetOut, StorageUsageOut

router = APIRouter(prefix="/admin", tags=["content"])


@router.get("/assets")
def list_assets(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = None,
    asset_type: Optional[str] = None,  # "reference" or "generated"
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _staff=Depends(require_role("admin", "owner", "ops", "viewer")),
):
    """List all image assets (reference + generated) with unified pagination."""
    items = []
    total = 0

    # Build separate queries then merge
    include_ref = asset_type is None or asset_type == "reference"
    include_gen = asset_type is None or asset_type == "generated"

    if include_ref:
        ref_q = db.query(ReferenceImage)
        if user_id:
            ref_q = ref_q.filter(ReferenceImage.user_id == user_id)
        if search:
            ref_q = ref_q.filter(ReferenceImage.file_name.ilike(f"%{search}%"))
        ref_total = ref_q.count()
        total += ref_total

    if include_gen:
        gen_q = db.query(GeneratedImage)
        if user_id:
            gen_q = gen_q.filter(GeneratedImage.user_id == user_id)
        if search:
            gen_q = gen_q.filter(GeneratedImage.file_name.ilike(f"%{search}%"))
        gen_total = gen_q.count()
        total += gen_total

    # Collect results (interleaved by created_at desc)
    offset = (page - 1) * limit
    combined = []

    if include_ref:
        refs = (
            ref_q.order_by(ReferenceImage.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        for r in refs:
            combined.append(
                ImageAssetOut(
                    id=r.id,
                    user_id=r.user_id,
                    asset_type="reference",
                    file_name=r.file_name,
                    file_size=r.file_size,
                    mime_type=r.mime_type,
                    width=r.width,
                    height=r.height,
                    gcp_url=r.gcp_url,
                    thumbnail_url=r.thumbnail_url,
                    created_at=r.created_at,
                )
            )

    if include_gen:
        gens = (
            gen_q.order_by(GeneratedImage.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        for g in gens:
            combined.append(
                ImageAssetOut(
                    id=g.id,
                    user_id=g.user_id,
                    asset_type="generated",
                    file_name=g.file_name,
                    file_size=g.file_size,
                    mime_type=g.mime_type,
                    width=g.width,
                    height=g.height,
                    gcp_url=g.gcp_url,
                    thumbnail_url=g.thumbnail_url,
                    created_at=g.created_at,
                )
            )

    # Sort combined and trim to limit
    combined.sort(key=lambda x: x.created_at or "", reverse=True)
    items = combined[:limit]

    return {
        "items": [a.model_dump() for a in items],
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
    """Storage usage aggregated from reference_images and generated_images."""
    if group_by == "user":
        # Reference images per user
        ref_usage = (
            db.query(
                ReferenceImage.user_id,
                func.coalesce(func.sum(ReferenceImage.file_size), 0).label("total_bytes"),
                func.count(ReferenceImage.id).label("asset_count"),
            )
            .group_by(ReferenceImage.user_id)
            .all()
        )
        gen_usage = (
            db.query(
                GeneratedImage.user_id,
                func.coalesce(func.sum(GeneratedImage.file_size), 0).label("total_bytes"),
                func.count(GeneratedImage.id).label("asset_count"),
            )
            .group_by(GeneratedImage.user_id)
            .all()
        )
        # Merge by user_id
        merged: dict[int, dict] = {}
        for uid, total_bytes, count in ref_usage:
            merged.setdefault(uid, {"total_bytes": 0, "asset_count": 0})
            merged[uid]["total_bytes"] += int(total_bytes)
            merged[uid]["asset_count"] += count
        for uid, total_bytes, count in gen_usage:
            merged.setdefault(uid, {"total_bytes": 0, "asset_count": 0})
            merged[uid]["total_bytes"] += int(total_bytes)
            merged[uid]["asset_count"] += count

        return [
            StorageUsageOut(
                user_id=uid,
                total_bytes=data["total_bytes"],
                asset_count=data["asset_count"],
            )
            for uid, data in merged.items()
        ]
    else:
        # Generated images have session_id which links to projects
        # Reference images also have session_id
        # For project grouping, we go via session → project
        from app.models.models import GenerationSession

        results: dict[int, dict] = {}
        # Generated images → session → project
        gen_rows = (
            db.query(
                GenerationSession.project_id,
                func.coalesce(func.sum(GeneratedImage.file_size), 0).label("total_bytes"),
                func.count(GeneratedImage.id).label("asset_count"),
            )
            .join(GenerationSession, GeneratedImage.session_id == GenerationSession.id)
            .filter(GenerationSession.project_id.isnot(None))
            .group_by(GenerationSession.project_id)
            .all()
        )
        for pid, total_bytes, count in gen_rows:
            results.setdefault(pid, {"total_bytes": 0, "asset_count": 0})
            results[pid]["total_bytes"] += int(total_bytes)
            results[pid]["asset_count"] += count

        return [
            StorageUsageOut(
                project_id=pid,
                total_bytes=data["total_bytes"],
                asset_count=data["asset_count"],
            )
            for pid, data in results.items()
        ]
