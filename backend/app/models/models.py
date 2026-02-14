import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def uuid_str() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=uuid_str)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    status = Column(String(32), nullable=False, default="active")  # active, suspended, deleted
    created_at = Column(DateTime(timezone=True), default=utc_now)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    org_id = Column(String(36), nullable=True, index=True)
    mfa_enabled = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    linked_providers = Column(JSON, default=list)
    plan = Column(String(32), nullable=False, default="free")  # free, pro, enterprise
    storage_used_bytes = Column(BigInteger, default=0)
    hashed_password = Column(String(255), nullable=False)

    sessions = relationship("Session", back_populates="user")
    token_wallet = relationship("TokenWallet", back_populates="user", uselist=False)
    token_transactions = relationship("TokenTransaction", back_populates="user")
    user_roles = relationship("UserRole", back_populates="user")
    generation_jobs = relationship("GenerationJob", back_populates="user")
    media_assets = relationship("MediaAsset", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=uuid_str)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    ip = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    user = relationship("User", back_populates="sessions")


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=uuid_str)
    name = Column(String(32), unique=True, nullable=False)  # viewer, support, ops, billing, admin, owner

    user_roles = relationship("UserRole", back_populates="role")
    staff_roles = relationship("StaffRole", back_populates="role")


class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(String(36), primary_key=True, default=uuid_str)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False, index=True)

    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")


class StaffAccount(Base):
    __tablename__ = "staff_accounts"

    id = Column(String(36), primary_key=True, default=uuid_str)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    mfa_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    staff_roles = relationship("StaffRole", back_populates="staff")


class StaffRole(Base):
    __tablename__ = "staff_roles"

    id = Column(String(36), primary_key=True, default=uuid_str)
    staff_id = Column(String(36), ForeignKey("staff_accounts.id"), nullable=False, index=True)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False, index=True)

    staff = relationship("StaffAccount", back_populates="staff_roles")
    role = relationship("Role", back_populates="staff_roles")


class TokenWallet(Base):
    __tablename__ = "token_wallets"

    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True)
    balance = Column(Integer, default=0)

    user = relationship("User", back_populates="token_wallet")


class TokenTransaction(Base):
    __tablename__ = "token_transactions"

    id = Column(String(36), primary_key=True, default=uuid_str)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    type = Column(
        String(32), nullable=False
    )  # credit_grant, purchase, usage_debit, refund, chargeback, expiration, adjustment
    reason = Column(Text, nullable=True)
    ref_type = Column(String(64), nullable=True)
    ref_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    created_by_admin_id = Column(String(36), nullable=True)

    user = relationship("User", back_populates="token_transactions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=uuid_str)
    actor_id = Column(String(36), nullable=True, index=True)
    action = Column(String(64), nullable=False)
    target_type = Column(String(64), nullable=True)
    target_id = Column(String(36), nullable=True, index=True)
    before_json = Column(JSON, nullable=True)
    after_json = Column(JSON, nullable=True)
    ip = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(String(36), primary_key=True, default=uuid_str)
    type = Column(String(64), nullable=False, index=True)
    user_id = Column(String(36), nullable=True, index=True)
    org_id = Column(String(36), nullable=True, index=True)
    project_id = Column(String(36), nullable=True, index=True)
    shot_id = Column(String(36), nullable=True, index=True)
    payload_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id = Column(String(36), primary_key=True, default=uuid_str)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    shot_id = Column(String(36), nullable=True, index=True)
    project_id = Column(String(36), nullable=True, index=True)
    status = Column(
        String(32), nullable=False, default="pending"
    )  # pending, running, completed, failed, cancelled
    model = Column(String(128), nullable=False)
    prompt = Column(Text, nullable=True)
    settings_json = Column(JSON, nullable=True)
    output_urls = Column(JSON, nullable=True)
    error_trace = Column(Text, nullable=True)
    tokens_consumed = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="generation_jobs")


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(String(36), primary_key=True, default=uuid_str)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String(36), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    kind = Column(String(32), nullable=False)  # image, video, reference
    source = Column(String(32), nullable=False)  # upload, generated
    size_bytes = Column(BigInteger, default=0)
    url = Column(Text, nullable=True)
    flagged = Column(Boolean, default=False)
    flag_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="media_assets")


class ModelConfig(Base):
    __tablename__ = "model_configs"

    id = Column(String(36), primary_key=True, default=uuid_str)
    name = Column(String(128), unique=True, nullable=False)
    enabled = Column(Boolean, default=True)
    token_cost = Column(Integer, default=0)
    concurrency_limit = Column(Integer, nullable=True)


class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id = Column(String(36), primary_key=True, default=uuid_str)
    name = Column(String(64), unique=True, nullable=False)
    enabled = Column(Boolean, default=False)
    rollout_percent = Column(Integer, default=0)
    description = Column(Text, nullable=True)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(36), primary_key=True, default=uuid_str)
    name = Column(String(128), nullable=False)
    key_hash = Column(String(255), nullable=False)
    scopes = Column(JSON, default=list)
    created_by = Column(String(36), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
