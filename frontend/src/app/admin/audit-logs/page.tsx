"use client";

import { useEffect, useState, useCallback } from "react";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DetailDrawer } from "@/components/ui/detail-drawer";
import { JSONViewer } from "@/components/ui/json-viewer";
import { Badge } from "@/components/ui/badge";
import { getAuditLogs, type AuditLogsParams } from "@/lib/api";
import type { AuditLog } from "@/lib/types";
import { format } from "date-fns";

const ACTION_OPTIONS = [
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "login", label: "Login" },
];

const TARGET_TYPE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "project", label: "Project" },
  { value: "asset", label: "Asset" },
  { value: "job", label: "Job" },
];

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    action: "",
    target_type: "",
    actor_id: "",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params: AuditLogsParams = {
      page,
      limit,
      action: filterValues.action || undefined,
      target_type: filterValues.target_type || undefined,
      actor_id: filterValues.actor_id || undefined,
    };
    getAuditLogs(params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load audit logs");
      })
      .finally(() => setLoading(false));
  }, [page, limit, filterValues.action, filterValues.target_type, filterValues.actor_id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClear = () => {
    setSearch("");
    setFilterValues({ action: "", target_type: "", actor_id: "" });
    setPage(1);
  };

  const handleRowClick = (row: AuditLog) => {
    setSelectedLog(row);
    setDrawerOpen(true);
  };

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: "created_at",
      label: "Timestamp",
      render: (row) => format(new Date(row.created_at), "yyyy-MM-dd HH:mm:ss"),
    },
    {
      key: "actor_id",
      label: "Actor",
      render: (row) => row.actor_id ?? "—",
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <Badge variant="secondary" className="capitalize">
          {row.action}
        </Badge>
      ),
    },
    {
      key: "target_type",
      label: "Target Type",
      render: (row) => row.target_type ?? "—",
    },
    {
      key: "target_id",
      label: "Target ID",
      render: (row) => row.target_id ?? "—",
    },
    {
      key: "ip",
      label: "IP",
      render: (row) => row.ip ?? "—",
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
      {error && <p className="text-destructive">{error}</p>}
      <FilterBar
        searchPlaceholder="Search by actor ID..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { key: "action", label: "Action", options: ACTION_OPTIONS },
          { key: "target_type", label: "Target type", options: TARGET_TYPE_OPTIONS },
          { key: "actor_id", label: "Actor", options: [] },
        ]}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onClear={handleClear}
      />
      <DataTable
        columns={columns}
        data={items}
        totalCount={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        loading={loading}
        onRowClick={handleRowClick}
        emptyMessage="No audit logs found."
      />
      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedLog ? `Audit: ${selectedLog.action}` : "Audit details"}
        width="42rem"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">Before</h3>
                <JSONViewer
                  data={selectedLog.before_json ?? {}}
                  defaultExpanded={1}
                  className="max-h-64"
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">After</h3>
                <JSONViewer
                  data={selectedLog.after_json ?? {}}
                  defaultExpanded={1}
                  className="max-h-64"
                />
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
