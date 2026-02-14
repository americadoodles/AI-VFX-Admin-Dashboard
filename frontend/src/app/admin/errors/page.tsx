"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorDashboard, getIncidents } from "@/lib/api";
import type { ErrorDashboardData, Incident } from "@/lib/types";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function ErrorDashboardPage() {
  const [dashboard, setDashboard] = useState<ErrorDashboardData | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getErrorDashboard(), getIncidents(15)])
      .then(([dashboardRes, incidentsRes]) => {
        if (!cancelled) {
          setDashboard(dashboardRes);
          setIncidents(incidentsRes);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const byModel = dashboard?.by_model ?? [];
  const topByModel = [...byModel].sort((a, b) => b.count - a.count).slice(0, 10);

  const incidentColumns: DataTableColumn<Incident>[] = [
    {
      key: "created_at",
      label: "Time",
      render: (row) => new Date(row.created_at).toLocaleString(),
    },
    {
      key: "job_id",
      label: "Job",
      render: (row) => (
        <Button variant="link" className="p-0 h-auto font-mono text-sm" asChild>
          <Link href={`/admin/generation-jobs/${row.job_id}`}>
            {row.job_id.slice(0, 12)}...
          </Link>
        </Button>
      ),
    },
    {
      key: "error_summary",
      label: "Error",
      render: (row) => (
        <span className="max-w-md truncate block text-muted-foreground">
          {row.error_summary}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Error Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-1">
        {loading ? (
          <Skeleton className="h-24 w-full max-w-xs" />
        ) : (
          <KPICard label="Total failed (period)" value={dashboard?.total_failed ?? 0} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <h2 className="text-lg font-medium text-foreground">Top errors by frequency (by model)</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : topByModel.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topByModel}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      type="number"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      stroke="hsl(var(--border))"
                    />
                    <YAxis
                      type="category"
                      dataKey="model"
                      width={75}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      stroke="hsl(var(--border))"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="count" name="Failures" radius={[0, 4, 4, 0]}>
                      {topByModel.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No data.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <h2 className="text-lg font-medium text-foreground">Failure rate by model (horizontal)</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : byModel.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={byModel.slice(0, 8)}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="model"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      stroke="hsl(var(--border))"
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      stroke="hsl(var(--border))"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" name="Failures" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <h2 className="text-lg font-medium text-foreground">Recent failed jobs</h2>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={incidentColumns}
            data={incidents}
            totalCount={incidents.length}
            page={1}
            limit={15}
            onPageChange={() => {}}
            onLimitChange={() => {}}
            loading={loading}
            emptyMessage="No recent failed jobs."
          />
        </CardContent>
      </Card>
    </div>
  );
}
