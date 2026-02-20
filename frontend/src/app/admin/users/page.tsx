"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { getEvents, getUsers } from "@/lib/api";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";

type NormalizedUser = {
  id: string;
  email: string;
  name: string;
  plan: string;
  status: string;
  createdAt: string | null;
  lastLoginAt: string | null;
};

type ActivitySummary = {
  count: number;
  lastActivityAt: string | null;
};

const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

function normalizeUser(raw: Record<string, unknown>): NormalizedUser {
  const id = String(raw.id ?? "");
  const isSuspended = Boolean(raw.is_suspended);
  const explicitStatus =
    typeof raw.status === "string" && raw.status.trim() ? raw.status : null;

  return {
    id,
    email: String(raw.email ?? "—"),
    name: String(raw.username ?? raw.name ?? "—"),
    plan: String(raw.plan ?? "free"),
    status: explicitStatus ?? (isSuspended ? "suspended" : "active"),
    createdAt:
      typeof raw.created_at === "string" && raw.created_at
        ? raw.created_at
        : null,
    lastLoginAt:
      typeof raw.last_login === "string"
        ? raw.last_login
        : typeof raw.last_login_at === "string"
          ? raw.last_login_at
          : null,
  };
}

export default function UsersPage() {
  const router = useRouter();
  const [items, setItems] = useState<NormalizedUser[]>([]);
  const [activityByUserId, setActivityByUserId] = useState<Record<string, ActivitySummary>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: "",
    plan: "",
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, eventsRes] = await Promise.all([
        getUsers({
          page,
          limit,
          search: search.trim() || undefined,
          status: filterValues.status || undefined,
          plan: filterValues.plan || undefined,
          sort: sortKey,
          order: sortDirection,
        }),
        getEvents({ page: 1, limit: 100 }),
      ]);

      const normalized = (usersRes.items ?? []).map((row) =>
        normalizeUser(row as unknown as Record<string, unknown>)
      );
      setItems(normalized);
      setTotal(usersRes.total ?? 0);

      const ids = new Set(normalized.map((user) => user.id));
      const summary: Record<string, ActivitySummary> = {};

      for (const event of eventsRes.items ?? []) {
        if (!event.user_id) continue;
        const userId = String(event.user_id);
        if (!ids.has(userId)) continue;
        const existing = summary[userId] ?? { count: 0, lastActivityAt: null };
        const candidate = typeof event.created_at === "string" ? event.created_at : null;
        const lastActivityAt =
          existing.lastActivityAt && candidate
            ? new Date(candidate) > new Date(existing.lastActivityAt)
              ? candidate
              : existing.lastActivityAt
            : existing.lastActivityAt ?? candidate;
        summary[userId] = {
          count: existing.count + 1,
          lastActivityAt,
        };
      }

      setActivityByUserId(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
      setItems([]);
      setTotal(0);
      setActivityByUserId({});
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterValues.status, filterValues.plan, sortKey, sortDirection]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilterValues({ status: "", plan: "" });
    setPage(1);
  };

  const columns = useMemo<DataTableColumn<NormalizedUser>[]>(
    () => [
      {
        key: "email",
        label: "User",
        sortable: true,
        render: (row) => (
          <div>
            <p className="font-medium text-foreground">{row.email}</p>
            <p className="text-xs text-muted-foreground">{row.name}</p>
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "plan",
        label: "Plan",
        render: (row) => (
          <Badge variant="secondary" className="capitalize">
            {row.plan}
          </Badge>
        ),
      },
      {
        key: "last_login",
        label: "Last Login",
        sortable: true,
        render: (row) =>
          row.lastLoginAt ? (
            <div>
              <p>{timeAgo(row.lastLoginAt)}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(row.lastLoginAt)}</p>
            </div>
          ) : (
            "—"
          ),
      },
      {
        key: "activity",
        label: "Activity Summary",
        render: (row) => {
          const summary = activityByUserId[row.id];
          if (!summary) {
            return <span className="text-muted-foreground">No recent events</span>;
          }
          return (
            <div>
              <p>{summary.count} events (sample)</p>
              <p className="text-xs text-muted-foreground">
                {summary.lastActivityAt ? `Last: ${timeAgo(summary.lastActivityAt)}` : "Last: —"}
              </p>
            </div>
          );
        },
      },
      {
        key: "created_at",
        label: "Joined",
        sortable: true,
        render: (row) => (row.createdAt ? formatDate(row.createdAt) : "—"),
      },
    ],
    [activityByUserId]
  );

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Platform Users</h1>
      {error && <p className="text-destructive">{error}</p>}
      <FilterBar
        searchPlaceholder="Search by email or username..."
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filters={[
          { key: "status", label: "Status", options: STATUS_OPTIONS },
          { key: "plan", label: "Plan", options: PLAN_OPTIONS },
        ]}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
      />
      <DataTable
        columns={columns}
        data={items}
        totalCount={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => {
          setLimit(nextLimit);
          setPage(1);
        }}
        onSort={(key, direction) => {
          setSortKey(key);
          setSortDirection(direction);
          setPage(1);
        }}
        sortKey={sortKey}
        sortDirection={sortDirection}
        loading={loading}
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
        emptyMessage="No users found."
      />
    </div>
  );
}