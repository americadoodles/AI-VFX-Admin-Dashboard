from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.models import AuditLog


def create_audit_log(
    db: Session,
    actor_id: Optional[str],
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    before_json: Optional[dict[str, Any]] = None,
    after_json: Optional[dict[str, Any]] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        before_json=before_json,
        after_json=after_json,
        ip=ip,
        user_agent=user_agent,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
