"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { getStorageUsage } from "@/lib/api";
import type { StorageUsage } from "@/lib/types";

function formatBytes(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
  return `${bytes} B`;
}

export default function StorageUsagePage() {
  const [view, setView] = useState<"user" | "project">("user");
  const [data, setData] = useState<StorageUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStorageUsage(view)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, [view]);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const chartData = data
    .slice(0, 15)
    .map((d) => ({
      name: view === "user" ? (d.user_id ?? "—").slice(0, 12) : (d.project_id ?? "—").slice(0, 12),
      size: d.total_bytes,
      fullLabel: view === "user" ? d.user_id : d.project_id,
    }));

  const columns: DataTableColumn<StorageUsage & { entityLabel?: string }>[] = [
    {
      key: "entityLabel",
      label: view === "user" ? "User" : "Project",
      render: (row) => (view === "user" ? row.user_id ?? "—" : row.project_id ?? "—"),
    },
    {
      key: "total_bytes",
      label: "Size",
      render: (row) => formatBytes(row.total_bytes),
    },
    {
      key: "asset_count",
      label: "Asset Count",
      render: (row) => row.asset_count.toLocaleString(),
    },
  ];

  const rows = data.map((d) => ({
    ...d,
    entityLabel: (view === "user" ? d.user_id : d.project_id) ?? undefined,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Storage Usage</h1>
        <div className="flex rounded-lg border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => setView("user")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "user"
                ? "bg-card text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By User
          </button>
          <button
            type="button"
            onClick={() => setView("project")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "project"
                ? "bg-card text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Project
          </button>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <h2 className="text-lg font-medium text-foreground">
            Top storage consumers ({view})
          </h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    stroke="hsl(var(--border))"
                    tickFormatter={(v) => formatBytes(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number | undefined) => [value != null ? formatBytes(value) : "", "Size"]}
                    labelFormatter={(_, payload) => payload[0]?.payload?.fullLabel ?? ""}
                  />
                  <Bar
                    dataKey="size"
                    name="Size"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No data.</p>
          )}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={rows}
        totalCount={data.length}
        page={1}
        limit={data.length || 10}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        loading={loading}
        emptyMessage="No storage data."
      />
    </div>
  );
}
