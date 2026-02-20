// ----- Pagination -----
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ----- Auth -----
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
  roles: string[];
}

// ----- User -----
export interface User {
  id: string;
  email: string;
  name: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
  org_id: string | null;
  mfa_enabled: boolean;
  verified_at: string | null;
  linked_providers: string[];
  plan: string;
  storage_used_bytes: number;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

export interface UserDetailResponse {
  user: User;
  token_balance: number;
  project_count: number;
  generation_count: number;
}

// ----- Token -----
export interface TokenTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  reason: string | null;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
  created_by_admin_id: string | null;
}

export interface TokenLedgerResponse {
  items: TokenTransaction[];
  total: number;
  page: number;
  limit: number;
}

export interface TokenDashboardData {
  total_issued: number;
  total_consumed: number;
  outstanding_balance: number;
  daily_trend: { date: string; issued: number; consumed: number }[];
}

export interface UserTokensResponse {
  user_id: string;
  balance: number;
  transactions: TokenTransaction[];
  total_transactions: number;
  page: number;
  limit: number;
}

// ----- Audit / Event -----
export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogResponse {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface EventLog {
  id: string;
  type: string;
  user_id: string | null;
  org_id: string | null;
  project_id: string | null;
  shot_id: string | null;
  payload_json: Record<string, unknown> | null;
  created_at: string;
}

export interface EventLogResponse {
  items: EventLog[];
  total: number;
  page: number;
  limit: number;
}

// ----- Generation Jobs -----
export interface GenerationJob {
  id: string;
  user_id: string;
  shot_id: string | null;
  project_id: string | null;
  status: string;
  model: string;
  prompt: string | null;
  tokens_consumed: number | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface GenerationJobDetail extends GenerationJob {
  settings_json: Record<string, unknown> | null;
  output_urls: string[] | null;
  error_trace: string | null;
}

export interface GenerationJobListResponse {
  items: GenerationJob[];
  total: number;
  page: number;
  limit: number;
}

// ----- Dashboard KPIs -----
export interface KPIData {
  total_users: number;
  active_users_24h: number;
  total_generations: number;
  generations_today: number;
  total_tokens_issued: number;
  total_tokens_consumed: number;
  failed_jobs_24h: number;
  avg_latency_ms: number | null;
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

export interface Incident {
  id: string;
  job_id: string;
  error_summary: string;
  created_at: string;
}

export interface QueueHealth {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

// ----- Media / Storage -----
export interface MediaAsset {
  id: string;
  user_id: string | number;
  project_id: string | null;
  filename: string;
  kind: string;
  source: string;
  size_bytes: number;
  url: string | null;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
}

export interface StorageUsage {
  user_id?: string | number | null;
  project_id?: string | number | null;
  total_bytes: number;
  asset_count: number;
}

// ----- Model / Feature Flag -----
export interface ModelConfig {
  id: string;
  name: string;
  enabled: boolean;
  token_cost: number;
  concurrency_limit: number | null;
}

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  rollout_percent: number;
  description: string | null;
}

// ----- Staff / API Key -----
export interface StaffUser {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
  roles: string[];
}

export interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  created_by: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

// ----- Error dashboard -----
export interface ErrorDashboardData {
  total_failed: number;
  by_model: { model: string; count: number }[];
}

// ----- Billing / Purchases -----
export interface PurchaseRecord {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  invoice_id: string | null;
  created_at: string;
}

export interface PurchaseListResponse {
  items: PurchaseRecord[];
  total: number;
  page: number;
  limit: number;
}
