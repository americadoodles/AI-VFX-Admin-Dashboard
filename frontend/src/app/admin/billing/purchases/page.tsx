"use client";

import { useEffect, useState, useCallback } from "react";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPurchases, type PurchasesParams } from "@/lib/api";
import type { PurchaseRecord } from "@/lib/types";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

export default function PurchaseHistoryPage() {
  const [items, setItems] = useState<PurchaseRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: "",
  });

  const fetchPurchases = useCallback(() => {
    setLoading(true);
    const params: PurchasesParams = {
      page,
      limit,
      status: filterValues.status || undefined,
      user_id: search.trim() || undefined,
    };
    getPurchases(params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load purchases");
      })
      .finally(() => setLoading(false));
  }, [page, limit, filterValues.status, search]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClear = () => {
    setSearch("");
    setFilterValues({ status: "" });
    setPage(1);
  };

  const columns: DataTableColumn<PurchaseRecord>[] = [
    {
      key: "created_at",
      label: "Date",
      render: (row) => format(new Date(row.created_at), "yyyy-MM-dd HH:mm"),
    },
    {
      key: "user_id",
      label: "User",
      render: (row) => row.user_id,
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => row.amount.toLocaleString(),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "invoice_id",
      label: "Invoice ID",
      render: (row) => row.invoice_id ?? "—",
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Purchase History</h1>
      {error && (
        <p className="text-destructive">{error}</p>
      )}
      <FilterBar
        searchPlaceholder="Search by user ID..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { key: "status", label: "Status", options: STATUS_OPTIONS },
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
        emptyMessage="No purchases found."
      />
    </div>
  );
}
