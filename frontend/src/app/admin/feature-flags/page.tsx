"use client";

import { useEffect, useState } from "react";
import * as Switch from "@radix-ui/react-switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getFeatureFlags, updateFeatureFlag } from "@/lib/api";
import type { FeatureFlag } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollout, setRollout] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFeatureFlags()
      .then((res) => {
        if (!cancelled) {
          setFlags(res);
          setRollout(Object.fromEntries(res.map((f) => [f.id, f.rollout_percent])));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load flags");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, []);

  const handleToggle = async (flag: FeatureFlag) => {
    setSavingId(flag.id);
    try {
      const updated = await updateFeatureFlag(flag.id, { enabled: !flag.enabled });
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? updated : f)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  const handleSave = async (flag: FeatureFlag) => {
    const value = rollout[flag.id];
    if (value === undefined) return;
    setSavingId(flag.id);
    try {
      const updated = await updateFeatureFlag(flag.id, {
        enabled: flag.enabled,
        rollout_percent: value,
      });
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? updated : f)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Feature Flags</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {flags.map((flag) => (
          <Card key={flag.id} className="border-border bg-card">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <h2 className="font-semibold text-foreground">{flag.name}</h2>
                {flag.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>
                )}
              </div>
              <Switch.Root
                checked={flag.enabled}
                onCheckedChange={() => handleToggle(flag)}
                disabled={savingId === flag.id}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full bg-muted transition-colors",
                  "data-[state=checked]:bg-primary",
                  "disabled:opacity-50"
                )}
              >
                <Switch.Thumb
                  className={cn(
                    "block h-5 w-5 rounded-full bg-card shadow transition-transform",
                    "translate-x-0.5 data-[state=checked]:translate-x-[22px]"
                  )}
                />
              </Switch.Root>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Rollout %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className="h-8 w-20"
                  value={rollout[flag.id] ?? flag.rollout_percent}
                  onChange={(e) =>
                    setRollout((prev) => ({
                      ...prev,
                      [flag.id]: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    }))
                  }
                />
              </div>
              <Button
                size="sm"
                onClick={() => handleSave(flag)}
                disabled={savingId === flag.id}
              >
                {savingId === flag.id ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {flags.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">No feature flags.</p>
      )}
    </div>
  );
}
