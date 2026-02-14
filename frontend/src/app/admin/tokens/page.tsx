"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingUp, Wallet, Calendar } from "lucide-react";
import { getTokenDashboard } from "@/lib/api";

export default function TokenDashboardPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getTokenDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTokenDashboard()
      .then((res) => {
        if (!cancelled) setData(res);
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

  const dailyAvg =
    data?.daily_trend?.length &&
    data.daily_trend.reduce((a, d) => a + (d.issued ?? 0) + (d.consumed ?? 0), 0) / data.daily_trend.length;
  const dailyAvgRounded = dailyAvg ? Math.round(dailyAvg) : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Token Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/tokens/ledger">Ledger</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/billing/purchases">Purchase History</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))
        ) : (
          <>
            <KPICard
              label="Total Issued"
              value={data?.total_issued ?? 0}
              icon={Coins}
            />
            <KPICard
              label="Total Consumed"
              value={data?.total_consumed ?? 0}
              icon={TrendingUp}
            />
            <KPICard
              label="Outstanding"
              value={data?.outstanding_balance ?? 0}
              icon={Wallet}
            />
            <KPICard
              label="Daily Avg"
              value={dailyAvgRounded}
              icon={Calendar}
            />
          </>
        )}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <h2 className="text-lg font-medium text-foreground">Daily usage trend (last 30 days)</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : data?.daily_trend?.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.daily_trend}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="issued" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="consumed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
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
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="issued"
                    name="Issued"
                    stroke="hsl(var(--chart-1))"
                    fill="url(#issued)"
                  />
                  <Area
                    type="monotone"
                    dataKey="consumed"
                    name="Consumed"
                    stroke="hsl(var(--chart-2))"
                    fill="url(#consumed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No trend data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
