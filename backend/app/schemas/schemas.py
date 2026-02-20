from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ----- Pagination -----
class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")


# ----- Auth -----
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


# ----- User -----
class UserOut(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    auth_provider: str = "email"
    avatar_url: Optional[str] = None
    is_confirmed: bool = False
    is_suspended: bool = False  # from admin_user_overrides
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Admin enrichment
    plan: Optional[str] = None  # from admin_user_overrides
    oauth_providers: list[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    limit: int


class UserSuspendRequest(BaseModel):
    reason: str


# ----- Token -----
class TokenTransactionOut(BaseModel):
    id: str
    user_id: int
    amount: int
    type: str
    reason: Optional[str] = None
    ref_type: Optional[str] = None
    ref_id: Optional[str] = None
    created_at: datetime
    created_by_admin_id: Optional[str] = None

    class Config:
        from_attributes = True


class TokenLedgerResponse(BaseModel):
    items: list[TokenTransactionOut]
    total: int
    page: int
    limit: int


class TokenGrantRequest(BaseModel):
    amount: int
    reason: str


class TokenDashboardResponse(BaseModel):
    total_issued: int
    total_consumed: int
    outstanding_balance: int
    daily_trend: list[dict[str, Any]]


# ----- Audit / Event -----
class AuditLogOut(BaseModel):
    id: str
    actor_id: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    before_json: Optional[dict] = None
    after_json: Optional[dict] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    limit: int


class EventLogOut(BaseModel):
    id: str
    type: str
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    project_id: Optional[str] = None
    shot_id: Optional[str] = None
    payload_json: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EventLogResponse(BaseModel):
    items: list[EventLogOut]
    total: int
    page: int
    limit: int


# ----- Generation Jobs -----
class GenerationJobOut(BaseModel):
    id: int
    user_id: int
    session_id: Optional[int] = None
    name: Optional[str] = None
    status: str
    model_used: str = "DALL-E"
    prompt: Optional[str] = None
    generated_prompt: Optional[str] = None
    shot_type: Optional[str] = None
    camera_angle: Optional[str] = None
    style: Optional[str] = None
    aspect_ratio: Optional[str] = None
    is_visible: bool = True
    duration_ms: Optional[int] = None  # computed from started_at/completed_at
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GenerationJobDetailOut(GenerationJobOut):
    location: Optional[str] = None
    lighting: Optional[str] = None
    weather: Optional[str] = None
    is_custom_enabled: bool = False
    number_of_shots: int = 1
    error_message: Optional[str] = None
    generation_method: Optional[str] = None
    sort_order: int = 0
    subject_action: Optional[str] = None
    custom_idea: Optional[str] = None
    suggested_prompt: Optional[str] = None
    parent_shot_id: Optional[int] = None
    version_number: int = 1
    generated_image_count: int = 0


class GenerationJobListResponse(BaseModel):
    items: list[GenerationJobOut]
    total: int
    page: int
    limit: int


# ----- Dashboard KPIs -----
class TrendData(BaseModel):
    date: str
    value: float
    label: Optional[str] = None


class KPIDashboardResponse(BaseModel):
    total_users: int
    active_users_24h: int
    total_generations: int
    generations_today: int
    total_tokens_issued: int
    total_tokens_consumed: int
    failed_jobs_24h: int
    avg_latency_ms: Optional[float] = None


class IncidentOut(BaseModel):
    id: int
    job_id: int
    error_summary: str
    created_at: Optional[datetime] = None


class QueueHealthResponse(BaseModel):
    pending: int
    running: int
    completed: int
    failed: int
    cancelled: int
    processing: int = 0  # shared DB uses 'processing' status


# ----- Content / Storage (from shared image tables) -----
class ImageAssetOut(BaseModel):
    """Unified view of reference_images and generated_images for admin."""
    id: int
    user_id: int
    asset_type: str  # "reference" or "generated"
    file_name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    gcp_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StorageUsageOut(BaseModel):
    user_id: Optional[int] = None
    project_id: Optional[int] = None
    total_bytes: int
    asset_count: int


# ----- Projects (from shared table) -----
class ProjectOut(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    aspect_ratio: Optional[str] = None
    session_count: int = 0
    shot_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    items: list[ProjectOut]
    total: int
    page: int
    limit: int


# ----- Model / Feature Flag -----
class ModelConfigOut(BaseModel):
    id: str
    name: str
    enabled: bool
    token_cost: int
    concurrency_limit: Optional[int] = None

    class Config:
        from_attributes = True


class ModelConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    token_cost: Optional[int] = None
    concurrency_limit: Optional[int] = None


class FeatureFlagOut(BaseModel):
    id: str
    name: str
    enabled: bool
    rollout_percent: int
    description: Optional[str] = None

    class Config:
        from_attributes = True


class FeatureFlagUpdate(BaseModel):
    enabled: Optional[bool] = None
    rollout_percent: Optional[int] = None
    description: Optional[str] = None


# ----- Staff / API Key -----
class StaffOut(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool
    mfa_enabled: bool
    created_at: datetime
    roles: list[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class StaffCreate(BaseModel):
    email: str
    name: str
    password: str
    role_names: list[str] = Field(default_factory=list)


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    mfa_enabled: Optional[bool] = None
    role_names: Optional[list[str]] = None


class ApiKeyOut(BaseModel):
    id: str
    name: str
    scopes: list = Field(default_factory=list)
    created_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyCreate(BaseModel):
    name: str
    scopes: list[str] = Field(default_factory=list)
    expires_in_days: Optional[int] = None


# ----- System -----
class SystemBannerRequest(BaseModel):
    message: Optional[str] = None
    severity: Optional[str] = None  # info, warning, error


class MaintenanceModeRequest(BaseModel):
    enabled: bool
    message: Optional[str] = None
