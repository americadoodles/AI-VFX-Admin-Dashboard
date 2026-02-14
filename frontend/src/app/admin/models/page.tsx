"use client";

import { useEffect, useState } from "react";
import * as Switch from "@radix-ui/react-switch";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getModels, updateModel } from "@/lib/api";
import type { ModelConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ModelConfigurationPage() {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, { token_cost: number; concurrency_limit: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getModels()
      .then((res) => {
        if (!cancelled) {
          setModels(res);
          setEditing(
            Object.fromEntries(
              res.map((m) => [
                m.id,
                {
                  token_cost: m.token_cost,
                  concurrency_limit: m.concurrency_limit != null ? String(m.concurrency_limit) : "",
                },
              ])
            )
          );
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load models");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, []);

  const setEdit = (id: string, field: "token_cost" | "concurrency_limit", value: string | number) => {
    setEditing((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleToggleEnabled = async (model: ModelConfig) => {
    setSavingId(model.id);
    try {
      const updated = await updateModel(model.id, { enabled: !model.enabled });
      setModels((prev) => prev.map((m) => (m.id === model.id ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  const handleSave = async (model: ModelConfig) => {
    const e = editing[model.id];
    if (!e) return;
    setSavingId(model.id);
    try {
      const updated = await updateModel(model.id, {
        token_cost: Number(e.token_cost),
        concurrency_limit: e.concurrency_limit === "" ? undefined : Number(e.concurrency_limit),
      });
      setModels((prev) => prev.map((m) => (m.id === model.id ? updated : m)));
      setEditing((prev) => ({
        ...prev,
        [model.id]: {
          token_cost: updated.token_cost,
          concurrency_limit: updated.concurrency_limit != null ? String(updated.concurrency_limit) : "",
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  const columns: DataTableColumn<ModelConfig>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => <span className="font-medium text-foreground">{row.name}</span>,
    },
    {
      key: "enabled",
      label: "Enabled",
      render: (row) => (
        <Switch.Root
          checked={row.enabled}
          onCheckedChange={() => handleToggleEnabled(row)}
          disabled={savingId === row.id}
          className={cn(
            "relative h-6 w-11 rounded-full bg-muted transition-colors",
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
      ),
    },
    {
      key: "token_cost",
      label: "Token Cost",
      render: (row) => (
        <Input
          type="number"
          min={0}
          step={0.01}
          className="h-8 w-24"
          value={editing[row.id]?.token_cost ?? row.token_cost}
          onChange={(e) => setEdit(row.id, "token_cost", e.target.value === "" ? 0 : Number(e.target.value))}
        />
      ),
    },
    {
      key: "concurrency_limit",
      label: "Concurrency Limit",
      render: (row) => (
        <Input
          type="number"
          min={0}
          className="h-8 w-24"
          placeholder="—"
          value={editing[row.id]?.concurrency_limit ?? (row.concurrency_limit != null ? String(row.concurrency_limit) : "")}
          onChange={(e) => setEdit(row.id, "concurrency_limit", e.target.value)}
        />
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <Button
          size="sm"
          onClick={() => handleSave(row)}
          disabled={savingId === row.id}
        >
          {savingId === row.id ? "Saving..." : "Save"}
        </Button>
      ),
    },
  ];

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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Model Configuration</h1>
      <DataTable
        columns={columns}
        data={models}
        totalCount={models.length}
        page={1}
        limit={models.length || 10}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        loading={false}
        emptyMessage="No models configured."
      />
    </div>
  );
}
