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
    id: str
    email: str
    name: str
    status: str
    created_at: datetime
    last_login_at: Optional[datetime] = None
    org_id: Optional[str] = None
    mfa_enabled: bool
    verified_at: Optional[datetime] = None
    linked_providers: list = Field(default_factory=list)
    plan: str
    storage_used_bytes: int = 0

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
    user_id: str
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
    id: str
    user_id: str
    shot_id: Optional[str] = None
    project_id: Optional[str] = None
    status: str
    model: str
    prompt: Optional[str] = None
    tokens_consumed: Optional[int] = None
    duration_ms: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GenerationJobDetailOut(GenerationJobOut):
    settings_json: Optional[dict] = None
    output_urls: Optional[list] = None
    error_trace: Optional[str] = None


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
    id: str
    job_id: str
    error_summary: str
    created_at: datetime


class QueueHealthResponse(BaseModel):
    pending: int
    running: int
    completed: int
    failed: int
    cancelled: int


# ----- Media / Storage -----
class MediaAssetOut(BaseModel):
    id: str
    user_id: str
    project_id: Optional[str] = None
    filename: str
    kind: str
    source: str
    size_bytes: int
    url: Optional[str] = None
    flagged: bool = False
    flag_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StorageUsageOut(BaseModel):
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    total_bytes: int
    asset_count: int


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
