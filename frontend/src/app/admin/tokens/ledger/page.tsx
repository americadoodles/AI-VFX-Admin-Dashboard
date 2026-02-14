"use client";

import { useEffect, useState, useCallback } from "react";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { getTokenLedger, type TokenLedgerParams } from "@/lib/api";
import type { TokenTransaction } from "@/lib/types";
import { format } from "date-fns";

const TYPE_OPTIONS = [
  { value: "credit_grant", label: "Credit Grant" },
  { value: "purchase", label: "Purchase" },
  { value: "usage_debit", label: "Usage Debit" },
  { value: "refund", label: "Refund" },
  { value: "chargeback", label: "Chargeback" },
  { value: "expiration", label: "Expiration" },
  { value: "adjustment", label: "Adjustment" },
];

export default function TokenLedgerPage() {
  const [items, setItems] = useState<TokenTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    type: "",
  });
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchLedger = useCallback(() => {
    setLoading(true);
    const params: TokenLedgerParams = {
      page,
      limit,
      type: filterValues.type || undefined,
      user_id: search.trim() || undefined,
    };
    getTokenLedger(params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load ledger");
      })
      .finally(() => setLoading(false));
  }, [page, limit, filterValues.type, search]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleSort = (key: string, direction: "asc" | "desc") => {
    setSortKey(key);
    setSortDirection(direction);
    fetchLedger();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClear = () => {
    setSearch("");
    setFilterValues({ type: "" });
    setPage(1);
  };

  const columns: DataTableColumn<TokenTransaction & { user_email?: string }>[] = [
    {
      key: "created_at",
      label: "Date",
      sortable: true,
      render: (row) => format(new Date(row.created_at), "yyyy-MM-dd HH:mm"),
    },
    {
      key: "user_id",
      label: "User",
      render: (row) => (row as { user_email?: string }).user_email ?? row.user_id,
    },
    {
      key: "type",
      label: "Type",
      render: (row) => (
        <Badge variant="secondary" className="capitalize">
          {row.type.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => (
        <span className={row.amount >= 0 ? "text-success" : "text-destructive"}>
          {row.amount >= 0 ? "+" : ""}
          {row.amount}
        </span>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      render: (row) => row.reason ?? "—",
    },
    {
      key: "ref_id",
      label: "Reference",
      render: (row) => row.ref_id ?? row.ref_type ?? "—",
    },
  ];

  const rows = items as (TokenTransaction & { user_email?: string })[];

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Token Ledger</h1>
      {error && (
        <p className="text-destructive">{error}</p>
      )}
      <FilterBar
        searchPlaceholder="Search by user ID..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { key: "type", label: "Type", options: TYPE_OPTIONS },
        ]}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onClear={handleClear}
      />
      <DataTable
        columns={columns}
        data={rows}
        totalCount={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSort={handleSort}
        sortKey={sortKey}
        sortDirection={sortDirection}
        loading={loading}
        emptyMessage="No ledger entries found."
      />
    </div>
  );
}
