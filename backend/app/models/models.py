"""
SQLAlchemy models for the AI VFX Admin Dashboard.

Two categories of tables:
1. SHARED tables – owned by the video-gen backend, already exist in the
   PostgreSQL database.  The admin dashboard reads (and occasionally writes)
   these.  They use SERIAL integer primary keys.
2. ADMIN tables – owned by this admin dashboard, created via
   Base.metadata.create_all().  They use UUID string primary keys.
"""
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def uuid_str() -> str:
    return str(uuid.uuid4())


# ═══════════════════════════════════════════════════════════════════════════
# SHARED TABLES  (match the PostgreSQL schema from db/schema*.sql + migrations)
# These tables are NOT created by the admin dashboard – they already exist.
# ═══════════════════════════════════════════════════════════════════════════

class User(Base):
    """Shared users table (schema.sql)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), nullable=True)
    password = Column(String(255), nullable=True)  # NULL for OAuth-only users
    auth_provider = Column(String(50), default="email")
    provider_user_id = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    is_confirmed = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    # Relationships → shared tables
    oauth_accounts = relationship("OAuthAccount", back_populates="user", lazy="dynamic")
    generation_sessions = relationship("GenerationSession", back_populates="user", lazy="dynamic")
    projects = relationship("Project", back_populates="user", lazy="dynamic")
    generation_jobs = relationship("GenerationJob", back_populates="user", lazy="dynamic")
    reference_images = relationship("ReferenceImage", back_populates="user", lazy="dynamic")
    generated_images = relationship("GeneratedImage", back_populates="user", lazy="dynamic")

    # Relationships → admin tables
    admin_override = relationship("AdminUserOverride", back_populates="user", uselist=False)
    token_wallet = relationship("TokenWallet", back_populates="user", uselist=False)
    token_transactions = relationship("TokenTransaction", back_populates="user", lazy="dynamic")


class OAuthAccount(Base):
    """Shared OAuth accounts table (schema.sql)."""
    __tablename__ = "oauth_accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), nullable=False)
    provider_user_id = Column(String(255), nullable=False)
    provider_email = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    scope = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="oauth_accounts")


class GenerationSession(Base):
    """Shared sessions table (schema_image_generation.sql).
    These are generation workspace sessions, NOT auth sessions."""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), default="New Session")
    thumbnail_url = Column(Text, nullable=True)
    generated_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="generation_sessions")
    project = relationship("Project", back_populates="sessions")
    generation_jobs = relationship("GenerationJob", back_populates="session", lazy="dynamic")


class ReferenceImage(Base):
    """Shared reference_images table (schema_image_generation.sql)."""
    __tablename__ = "reference_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    gcp_bucket_path = Column(Text, nullable=False)
    gcp_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=False)
    file_size = Column(BigInteger, nullable=True)
    mime_type = Column(String(100), nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="reference_images")


class GenerationJob(Base):
    """Shared generation_jobs table (schema_image_generation.sql + all migrations)."""
    __tablename__ = "generation_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True, index=True)

    # User input parameters
    name = Column(Text, nullable=True)
    prompt = Column(Text, nullable=False)
    generated_prompt = Column(Text, nullable=True)
    is_visible = Column(Boolean, default=True)

    # Generation settings
    shot_type = Column(Text, default="None")
    camera_angle = Column(Text, default="None")
    style = Column(Text, default="None")
    location = Column(Text, nullable=True)
    lighting = Column(Text, nullable=True)
    weather = Column(Text, nullable=True)
    is_custom_enabled = Column(Boolean, default=False)
    aspect_ratio = Column(String(20), default="16:9")
    number_of_shots = Column(Integer, default=1)
    model_used = Column(String(50), default="DALL-E")

    # Generation metadata
    status = Column(String(20), default="pending", index=True)
    error_message = Column(Text, nullable=True)
    generation_method = Column(String(50), nullable=True)

    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    # Migration 002: selected image
    selected_image_id = Column(
        Integer,
        ForeignKey("generated_images.id", ondelete="SET NULL", use_alter=True),
        nullable=True,
    )
    # Migration 003: sort order
    sort_order = Column(Integer, default=0)
    # Migration 007: breakdown fields
    subject_action = Column(Text, nullable=True)
    custom_idea = Column(Text, nullable=True)
    suggested_prompt = Column(Text, nullable=True)
    # Migration 009: versioning
    parent_shot_id = Column(
        Integer,
        ForeignKey("generation_jobs.id", ondelete="CASCADE"),
        nullable=True,
    )
    version_number = Column(Integer, default=1)

    # Relationships
    user = relationship("User", back_populates="generation_jobs")
    session = relationship("GenerationSession", back_populates="generation_jobs")
    generated_images = relationship(
        "GeneratedImage",
        back_populates="generation_job",
        foreign_keys="[GeneratedImage.generation_job_id]",
        lazy="dynamic",
    )


class GeneratedImage(Base):
    """Shared generated_images table (schema_image_generation.sql)."""
    __tablename__ = "generated_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    generation_job_id = Column(Integer, ForeignKey("generation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True, index=True)

    # Image storage
    gcp_bucket_path = Column(Text, nullable=False)
    gcp_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text, nullable=True)

    # Image metadata
    file_name = Column(String(255), nullable=False)
    file_size = Column(BigInteger, nullable=True)
    mime_type = Column(String(100), default="image/jpeg")
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)

    # Generation metadata
    prompt_used = Column(Text, nullable=True)
    generation_index = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True))

    # Relationships
    generation_job = relationship(
        "GenerationJob",
        back_populates="generated_images",
        foreign_keys=[generation_job_id],
    )
    user = relationship("User", back_populates="generated_images")


class GenerationJobReferenceImage(Base):
    """Shared junction table (schema_image_generation.sql)."""
    __tablename__ = "generation_job_reference_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    generation_job_id = Column(Integer, ForeignKey("generation_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    reference_image_id = Column(Integer, ForeignKey("reference_images.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True))


class Project(Base):
    """Shared projects table (migration 004 + 005)."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    script = Column(Text, nullable=True)
    additional_notes = Column(Text, nullable=True)
    aspect_ratio = Column(String(10), default="9:16")
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="projects")
    sessions = relationship("GenerationSession", back_populates="project", lazy="dynamic")
    characters = relationship("ProjectCharacter", back_populates="project", lazy="dynamic")
    environments = relationship("ProjectEnvironment", back_populates="project", lazy="dynamic")
    references = relationship("ProjectReference", back_populates="project", lazy="dynamic")
    shots = relationship("ProjectShot", back_populates="project", lazy="dynamic")


class ProjectCharacter(Base):
    """Shared project_characters table (migration 005)."""
    __tablename__ = "project_characters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, default="New Character")
    description = Column(Text, default="")
    image_urls = Column(JSON, default=list)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    project = relationship("Project", back_populates="characters")


class ProjectEnvironment(Base):
    """Shared project_environments table (migration 005)."""
    __tablename__ = "project_environments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, default="New Environment")
    description = Column(Text, default="")
    image_urls = Column(JSON, default=list)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    project = relationship("Project", back_populates="environments")


class ProjectReference(Base):
    """Shared project_references table (migration 005)."""
    __tablename__ = "project_references"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, default="New Reference")
    image_urls = Column(JSON, default=list)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    project = relationship("Project", back_populates="references")


class ProjectShot(Base):
    """Shared project_shots table (migration 005)."""
    __tablename__ = "project_shots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, default="New Shot")
    script_line = Column(Text, default="")
    image_urls = Column(JSON, default=list)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))

    project = relationship("Project", back_populates="shots")


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN-ONLY TABLES  (created & managed by this admin dashboard)
# ═══════════════════════════════════════════════════════════════════════════

class AdminUserOverride(Base):
    """Admin-specific user status overlay.
    Stores suspension state and admin notes without modifying the shared users table."""
    __tablename__ = "admin_user_overrides"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    is_suspended = Column(Boolean, default=False)
    suspended_at = Column(DateTime(timezone=True), nullable=True)
    suspended_reason = Column(Text, nullable=True)
    plan = Column(String(32), default="free")
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="admin_override")


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=uuid_str)
    name = Column(String(32), unique=True, nullable=False)  # viewer, support, ops, billing, admin, owner

    staff_roles = relationship("StaffRole", back_populates="role")


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

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    balance = Column(Integer, default=0)

    user = relationship("User", back_populates="token_wallet")


class TokenTransaction(Base):
    __tablename__ = "token_transactions"

    id = Column(String(36), primary_key=True, default=uuid_str)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
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


# ---------------------------------------------------------------------------
# List of admin-only tables (for selective create_all in seed.py)
# ---------------------------------------------------------------------------
ADMIN_TABLES = [
    AdminUserOverride.__table__,
    Role.__table__,
    StaffAccount.__table__,
    StaffRole.__table__,
    TokenWallet.__table__,
    TokenTransaction.__table__,
    AuditLog.__table__,
    EventLog.__table__,
    ModelConfig.__table__,
    FeatureFlag.__table__,
    ApiKey.__table__,
]
