"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { Button } from "./button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DataTableColumn<T = unknown> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T = unknown> {
  columns: DataTableColumn<T>[];
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  emptyMessage?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  totalCount,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onSort,
  loading = false,
  onRowClick,
  sortKey,
  sortDirection,
  emptyMessage = "No data found.",
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalCount);

  const handleSort = (key: string) => {
    if (!onSort) return;
    const col = columns.find((c) => c.key === key);
    if (!col?.sortable) return;
    const next = sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    onSort(key, next);
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-foreground">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-muted-foreground",
                    col.sortable && onSort && "cursor-pointer select-none hover:text-foreground"
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-foreground">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: Math.min(5, limit) }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    "border-b border-border transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
          <div className="text-sm text-muted-foreground">
            Showing {start}–{end} of {totalCount}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
