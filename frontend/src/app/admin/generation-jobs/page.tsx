"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getGenerationJobs, type GenerationJobsParams } from "@/lib/api";
import type { GenerationJob } from "@/lib/types";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function GenerationJobsListPage() {
  const router = useRouter();
  const [items, setItems] = useState<GenerationJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: "",
    model: "",
    user_id: "",
  });

  const fetchJobs = useCallback(() => {
    setLoading(true);
    const params: GenerationJobsParams = {
      page,
      limit,
      status: filterValues.status || undefined,
      model: filterValues.model || undefined,
      user_id: filterValues.user_id || undefined,
    };
    getGenerationJobs(params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load jobs");
      })
      .finally(() => setLoading(false));
  }, [page, limit, filterValues.status, filterValues.model, filterValues.user_id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClear = () => {
    setSearch("");
    setFilterValues({ status: "", model: "", user_id: "" });
    setPage(1);
  };

  const handleRowClick = (row: GenerationJob) => {
    router.push(`/admin/generation-jobs/${row.id}`);
  };

  const truncateId = (id: string) =>
    id.length > 12 ? `${id.slice(0, 8)}...` : id;

  const columns: DataTableColumn<GenerationJob>[] = [
    {
      key: "id",
      label: "Job ID",
      render: (row) => (
        <span className="font-mono text-muted-foreground">{truncateId(row.id)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "model",
      label: "Model",
      render: (row) => row.model,
    },
    {
      key: "user_id",
      label: "User",
      render: (row) => row.user_id,
    },
    {
      key: "tokens_consumed",
      label: "Tokens",
      render: (row) => row.tokens_consumed ?? "—",
    },
    {
      key: "duration_ms",
      label: "Duration",
      render: (row) =>
        row.duration_ms != null ? `${row.duration_ms}ms` : "—",
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => format(new Date(row.created_at), "yyyy-MM-dd HH:mm"),
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Generation Jobs</h1>
      {error && <p className="text-destructive">{error}</p>}
      <FilterBar
        searchPlaceholder="Search..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { key: "status", label: "Status", options: STATUS_OPTIONS },
          { key: "model", label: "Model", options: [] },
          { key: "user_id", label: "User", options: [] },
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
        emptyMessage="No generation jobs found."
      />
    </div>
  );
}
