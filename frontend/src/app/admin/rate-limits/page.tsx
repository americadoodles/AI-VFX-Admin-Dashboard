"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Info } from "lucide-react";

interface RateLimitRow {
  endpoint: string;
  requestsPerMinute: number;
  burstLimit: number;
}

const PLACEHOLDER_DATA: RateLimitRow[] = [
  { endpoint: "/api/v1/generate", requestsPerMinute: 60, burstLimit: 10 },
  { endpoint: "/api/v1/upload", requestsPerMinute: 30, burstLimit: 5 },
  { endpoint: "/admin/*", requestsPerMinute: 120, burstLimit: 20 },
];

const columns: DataTableColumn<RateLimitRow>[] = [
  { key: "endpoint", label: "Endpoint", render: (row) => <span className="font-mono text-sm">{row.endpoint}</span> },
  { key: "requestsPerMinute", label: "Requests / min", render: (row) => row.requestsPerMinute },
  { key: "burstLimit", label: "Burst limit", render: (row) => row.burstLimit },
];

export default function RateLimitsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Rate Limits</h1>
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-4">
        <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Rate limit configuration. This is a Phase 3 feature. The table below shows placeholder data.
        </p>
      </div>
      <Card className="border-border bg-card">
        <CardHeader>
          <h2 className="text-lg font-medium text-foreground">Endpoint limits</h2>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={PLACEHOLDER_DATA}
            totalCount={PLACEHOLDER_DATA.length}
            page={1}
            limit={10}
            onPageChange={() => {}}
            onLimitChange={() => {}}
            emptyMessage="No rate limits configured."
          />
        </CardContent>
      </Card>
    </div>
  );
}
