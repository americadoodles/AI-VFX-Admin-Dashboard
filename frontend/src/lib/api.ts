const API_BASE = "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(Array.isArray(err.detail) ? err.detail[0]?.msg ?? err.detail : err.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ----- Auth -----
export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function login(data: LoginPayload): Promise<TokenResponse> {
  return request<TokenResponse>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<void> {
  await request("/admin/auth/logout", { method: "POST" });
}

export async function getMe() {
  return request<import("./types").AuthUser>("/admin/auth/me");
}

// ----- Dashboard -----
export async function getKPIs() {
  return request<import("./types").KPIData>("/admin/dashboard/kpis");
}

export async function getTrends(days = 7) {
  return request<{ trends: import("./types").TrendData[] }>(`/admin/dashboard/trends?days=${days}`);
}

export async function getIncidents(limit = 20) {
  return request<import("./types").Incident[]>(`/admin/dashboard/incidents?limit=${limit}`);
}

export async function getQueueHealth() {
  return request<import("./types").QueueHealth>("/admin/dashboard/queue-health");
}

// ----- Users -----
export interface UsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan?: string;
  sort?: string;
  order?: "asc" | "desc";
}

export async function getUsers(params: UsersParams = {}) {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);
  if (params.plan) sp.set("plan", params.plan);
  if (params.sort) sp.set("sort", params.sort);
  if (params.order) sp.set("order", params.order);
  const q = sp.toString();
  return request<import("./types").UserListResponse>(`/admin/users${q ? `?${q}` : ""}`);
}

export async function getUser(id: string) {
  return request<import("./types").UserDetailResponse>(`/admin/users/${id}`);
}

export async function suspendUser(userId: string, reason: string): Promise<void> {
  await request(`/admin/users/${userId}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function unsuspendUser(userId: string): Promise<void> {
  await request(`/admin/users/${userId}/unsuspend`, { method: "POST" });
}

export async function resetMFA(userId: string): Promise<void> {
  await request(`/admin/users/${userId}/reset-mfa`, { method: "POST" });
}

export async function revokeSessions(userId: string): Promise<void> {
  await request(`/admin/users/${userId}/revoke-sessions`, { method: "POST" });
}

export async function impersonateUser(userId: string): Promise<{ impersonation_token: string }> {
  return request(`/admin/users/${userId}/impersonate`, { method: "POST" });
}

// ----- Tokens -----
export async function getTokenDashboard() {
  return request<import("./types").TokenDashboardData>("/admin/tokens/dashboard");
}

export interface TokenLedgerParams {
  page?: number;
  limit?: number;
  user_id?: string;
  type?: string;
}

export async function getTokenLedger(params: TokenLedgerParams = {}) {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.user_id) sp.set("user_id", params.user_id);
  if (params.type) sp.set("type", params.type);
  const q = sp.toString();
  return request<import("./types").TokenLedgerResponse>(`/admin/tokens/ledger${q ? `?${q}` : ""}`);
}

export async function getUserTokens(userId: string, page = 1, limit = 20) {
  return request<import("./types").UserTokensResponse>(
    `/admin/users/${userId}/tokens?page=${page}&limit=${limit}`
  );
}

export async function grantTokens(userId: string, amount: number, reason: string) {
  return request<{ message: string; user_id: string; amount: number; new_balance: number }>(
    `/admin/users/${userId}/tokens/grant`,
    { method: "POST", body: JSON.stringify({ amount, reason }) }
  );
}

// ----- Activity -----
export interface EventsParams {
  page?: number;
  limit?: number;
  type?: string;
  user_id?: string;
  search?: string;
}

export async function getEvents(params: EventsParams = {}) {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.type) sp.set("type", params.type);
  if (params.user_id) sp.set("user_id", params.user_id);
  if (params.search) sp.set("search", params.search);
  const q = sp.toString();
  return request<import("./types").EventLogResponse>(`/admin/events${q ? `?${q}` : ""}`);
}

export interface AuditLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  target_type?: string;
  actor_id?: string;
}

export async function getAuditLogs(params: AuditLogsParams = {}) {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.action) sp.set("action", params.action);
  if (params.target_type) sp.set("target_type", params.target_type);
  if (params.actor_id) sp.set("actor_id", params.actor_id);
  const q = sp.toString();
  return request<import("./types").AuditLogResponse>(`/admin/audit-logs${q ? `?${q}` : ""}`);
}

export interface GenerationJobsParams {
  page?: number;
  limit?: number;
  status?: string;
  user_id?: string;
  model?: string;
}

export async function getGenerationJobs(params: GenerationJobsParams = {}) {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", params.status);
  if (params.user_id) sp.set("user_id", params.user_id);
  if (params.model) sp.set("model", params.model);
  const q = sp.toString();
  return request<import("./types").GenerationJobListResponse>(
    `/admin/generation-jobs${q ? `?${q}` : ""}`
  );
}

export async function getGenerationJob(id: string) {
  return request<import("./types").GenerationJobDetail>(`/admin/generation-jobs/${id}`);
}

export async function getErrorDashboard() {
  return request<import("./types").ErrorDashboardData>("/admin/errors/dashboard");
}

// ----- Content -----
export interface AssetsParams {
  page?: number;
  limit?: number;
  user_id?: string;
  project_id?: string;
  kind?: string;
  source?: string;
  flagged?: boolean;
  search?: string;
}

export async function getAssets(params: AssetsParams = {}) {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.user_id) sp.set("user_id", params.user_id);
  if (params.project_id) sp.set("project_id", params.project_id);
  if (params.kind) sp.set("kind", params.kind);
  if (params.source) sp.set("source", params.source);
  if (params.flagged != null) sp.set("flagged", String(params.flagged));
  if (params.search) sp.set("search", params.search);
  const q = sp.toString();
  return request<{ items: import("./types").MediaAsset[]; total: number; page: number; limit: number }>(
    `/admin/assets${q ? `?${q}` : ""}`
  );
}

export async function getStorageUsage(groupBy: "user" | "project" = "user") {
  return request<import("./types").StorageUsage[]>(`/admin/storage/usage?group_by=${groupBy}`);
}

export async function flagAsset(id: string, reason?: string): Promise<void> {
  const path = reason ? `/admin/assets/${id}/flag?reason=${encodeURIComponent(reason)}` : `/admin/assets/${id}/flag`;
  await request(path, { method: "POST" });
}

// ----- System -----
export async function getModels() {
  return request<import("./types").ModelConfig[]>("/admin/models");
}

export async function updateModel(
  modelId: string,
  body: { enabled?: boolean; token_cost?: number; concurrency_limit?: number }
) {
  return request<import("./types").ModelConfig>(`/admin/models/${modelId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function getFeatureFlags() {
  return request<import("./types").FeatureFlag[]>("/admin/feature-flags");
}

export async function updateFeatureFlag(
  flagId: string,
  body: { enabled?: boolean; rollout_percent?: number; description?: string }
) {
  return request<import("./types").FeatureFlag>(`/admin/feature-flags/${flagId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function setIncidentBanner(body: { message?: string | null; severity?: string | null }): Promise<void> {
  await request("/admin/system/incident-banner", { method: "PUT", body: JSON.stringify(body) });
}

export async function setMaintenanceMode(body: { enabled: boolean; message?: string }): Promise<void> {
  await request("/admin/system/maintenance-mode", { method: "PUT", body: JSON.stringify(body) });
}

export async function retryJob(jobId: string): Promise<void> {
  await request(`/admin/generation-jobs/${jobId}/retry`, { method: "POST" });
}

export async function cancelJob(jobId: string): Promise<void> {
  await request(`/admin/generation-jobs/${jobId}/cancel`, { method: "POST" });
}

// ----- Roles (Staff / API Keys) -----
export async function getStaff() {
  return request<import("./types").StaffUser[]>("/admin/staff");
}

export async function createStaff(body: {
  email: string;
  name: string;
  password: string;
  role_names?: string[];
}) {
  return request<import("./types").StaffUser>("/admin/staff", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateStaff(
  staffId: string,
  body: { name?: string; is_active?: boolean; mfa_enabled?: boolean; role_names?: string[] }
) {
  return request<import("./types").StaffUser>(`/admin/staff/${staffId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteStaff(staffId: string): Promise<void> {
  await request(`/admin/staff/${staffId}`, { method: "DELETE" });
}

export async function getApiKeys() {
  return request<import("./types").ApiKey[]>("/admin/api-keys");
}

export async function createApiKey(body: {
  name: string;
  scopes?: string[];
  expires_in_days?: number;
}): Promise<{ id: string; name: string; key: string; expires_at: string | null; warning: string }> {
  return request("/admin/api-keys", { method: "POST", body: JSON.stringify(body) });
}

export async function revokeApiKey(keyId: string): Promise<void> {
  await request(`/admin/api-keys/${keyId}`, { method: "DELETE" });
}

// ----- Billing / Purchases -----
export interface PurchasesParams {
  page?: number;
  limit?: number;
  user_id?: string;
  status?: string;
}

export async function getPurchases(params: PurchasesParams = {}) {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.user_id) sp.set("user_id", params.user_id);
  if (params.status) sp.set("status", params.status);
  const q = sp.toString();
  return request<import("./types").PurchaseListResponse>(
    `/admin/billing/purchases${q ? `?${q}` : ""}`
  );
}
