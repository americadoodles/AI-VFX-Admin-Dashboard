"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Users, Zap, AlertCircle, Coins } from "lucide-react";
import { getKPIs, getTrends, getIncidents, getQueueHealth } from "@/lib/api";
import type { KPIData, TrendData, Incident, QueueHealth } from "@/lib/types";
import { KPICard } from "@/components/ui/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [queueHealth, setQueueHealth] = useState<QueueHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      getKPIs(),
      getTrends(30),
      getIncidents(20),
      getQueueHealth(),
    ])
      .then(([kpiRes, trendRes, incidentsRes, queueRes]) => {
        if (cancelled) return;
        setKpis(kpiRes);
        setTrends(trendRes.trends ?? []);
        setIncidents(incidentsRes ?? []);
        setQueueHealth(queueRes);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const failureRate =
    kpis && (kpis.generations_today ?? 0) > 0
      ? ((kpis.failed_jobs_24h ?? 0) / kpis.generations_today) * 100
      : 0;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of platform metrics and health.</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KPICard
              label="DAU (24h)"
              value={kpis?.active_users_24h ?? 0}
              icon={Users}
              onClick={() => router.push("/admin/users")}
            />
            <KPICard
              label="Generations today"
              value={kpis?.generations_today ?? 0}
              icon={Zap}
              onClick={() => router.push("/admin/generation-jobs")}
            />
            <KPICard
              label="Failure rate (24h)"
              value={failureRate.toFixed(1) + "%"}
              icon={AlertCircle}
              onClick={() => router.push("/admin/generation-jobs?status=failed")}
            />
            <KPICard
              label="Tokens consumed"
              value={(kpis?.total_tokens_consumed ?? 0).toLocaleString()}
              icon={Coins}
              onClick={() => router.push("/admin/tokens")}
            />
          </>
        )}
      </div>

      {/* Usage trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Usage trend (30 days)</CardTitle>
          <p className="text-sm text-muted-foreground">Daily activity</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trends.map((t) => ({ ...t, date: t.date }))}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--color-foreground)",
                    }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString()}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={() => "Usage"}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Usage"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two column: Incidents + Queue health */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Recent incidents</CardTitle>
            <p className="text-sm text-muted-foreground">Latest errors and failures</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent incidents.</p>
            ) : (
              <ul className="space-y-2">
                {incidents.map((inc) => (
                  <li
                    key={inc.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground">{inc.error_summary}</span>
                      <p className="truncate text-xs text-muted-foreground">Job: {inc.job_id}</p>
                    </div>
                    <Badge variant="destructive" className="shrink-0">
                      Error
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(inc.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Queue health</CardTitle>
            <p className="text-sm text-muted-foreground">Current job queue status</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : queueHealth ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full bg-warning")} />
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-foreground">{queueHealth.pending}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full bg-primary")} />
                    <span className="text-sm text-muted-foreground">Running</span>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-foreground">{queueHealth.running}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full bg-success")} />
                    <span className="text-sm text-muted-foreground">Completed</span>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-foreground">{queueHealth.completed}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full bg-destructive")} />
                    <span className="text-sm text-muted-foreground">Failed</span>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-foreground">{queueHealth.failed}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full bg-muted-foreground")} />
                    <span className="text-sm text-muted-foreground">Cancelled</span>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-foreground">{queueHealth.cancelled}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No queue data.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
