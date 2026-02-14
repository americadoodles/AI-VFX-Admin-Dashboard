"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { JSONViewer } from "@/components/ui/json-viewer";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import {
  getGenerationJob,
  retryJob,
  cancelJob,
} from "@/lib/api";
import type { GenerationJobDetail } from "@/lib/types";
import { format } from "date-fns";

export default function GenerationJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const [job, setJob] = useState<GenerationJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    getGenerationJob(jobId)
      .then((res) => {
        if (!cancelled) setJob(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load job");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const handleRetry = async () => {
    if (!jobId) return;
    setActionLoading(true);
    try {
      await retryJob(jobId);
      const updated = await getGenerationJob(jobId);
      setJob(updated);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    setActionLoading(true);
    try {
      await cancelJob(jobId);
      const updated = await getGenerationJob(jobId);
      setJob(updated);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (error && !job) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/generation-jobs">Back to jobs</Link>
        </Button>
      </div>
    );
  }

  if (loading || !job) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isFailed = job.status === "failed";
  const isRunning = job.status === "running" || job.status === "pending";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/generation-jobs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Job: {job.id.slice(0, 12)}...</h1>
        <StatusBadge status={job.status} />
        {isFailed && (
          <Button onClick={handleRetry} disabled={actionLoading}>
            Retry
          </Button>
        )}
        {isRunning && (
          <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
            Cancel
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Model: {job.model}</span>
        <span>Duration: {job.duration_ms != null ? `${job.duration_ms}ms` : "—"}</span>
        <span>Tokens: {job.tokens_consumed ?? "—"}</span>
        <span>Created: {format(new Date(job.created_at), "PPpp")}</span>
      </div>

      <Tabs defaultValue="prompt" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
          <TabsTrigger value="error">Error</TabsTrigger>
        </TabsList>
        <TabsContent value="prompt" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <h2 className="text-sm font-medium text-foreground">Prompt</h2>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/50 p-4 font-mono text-sm text-foreground">
                {job.prompt ?? "—"}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <h2 className="text-sm font-medium text-foreground">Job settings</h2>
            </CardHeader>
            <CardContent>
              <JSONViewer data={job.settings_json ?? {}} defaultExpanded={2} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="output" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <h2 className="text-sm font-medium text-foreground">Output</h2>
            </CardHeader>
            <CardContent>
              {job.output_urls?.length ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {job.output_urls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border border-border bg-muted"
                    >
                      <img
                        src={url}
                        alt={`Output ${i + 1}`}
                        className="h-32 w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No output URLs.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="error" className="mt-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <h2 className="text-sm font-medium text-foreground">Error</h2>
            </CardHeader>
            <CardContent>
              {job.error_trace ? (
                <pre className="overflow-auto whitespace-pre-wrap rounded-md border border-border bg-destructive/10 p-4 font-mono text-sm text-destructive">
                  {job.error_trace}
                </pre>
              ) : (
                <p className="text-muted-foreground">No error trace.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
