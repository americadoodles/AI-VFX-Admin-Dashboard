"use client";

import { useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DangerZone } from "@/components/ui/danger-zone";
import { getApiKeys, createApiKey, revokeApiKey } from "@/lib/api";
import type { ApiKey } from "@/lib/types";
import { format } from "date-fns";
import { Plus, Trash2, Copy, Check } from "lucide-react";

const SCOPES = ["read", "write", "admin", "tokens:read", "tokens:write"];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeKey, setRevokeKey] = useState<ApiKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createScopes, setCreateScopes] = useState<string[]>([]);
  const [createExpiresInDays, setCreateExpiresInDays] = useState<string>("30");

  useEffect(() => {
    let cancelled = false;
    getApiKeys()
      .then((res) => {
        if (!cancelled) setKeys(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load keys");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, []);

  const toggleScope = (scope: string) => {
    setCreateScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await createApiKey({
        name: createName,
        scopes: createScopes.length ? createScopes : undefined,
        expires_in_days:
          createExpiresInDays === "" ? undefined : Math.max(1, parseInt(createExpiresInDays, 10)),
      });
      setKeys((prev) => [
        ...prev,
        {
          id: res.id,
          name: res.name,
          scopes: [],
          created_by: null,
          expires_at: res.expires_at,
          revoked_at: null,
          created_at: new Date().toISOString(),
        },
      ]);
      setCreatedSecret(res.key);
      setCreateName("");
      setCreateScopes([]);
      setCreateExpiresInDays("30");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setSaving(false);
    }
  };

  const handleCopySecret = () => {
    if (createdSecret) {
      void navigator.clipboard.writeText(createdSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreatedSecret(null);
  };

  const openRevoke = (key: ApiKey) => {
    setRevokeKey(key);
    setRevokeOpen(true);
  };

  const handleRevoke = async () => {
    if (!revokeKey) return;
    setSaving(true);
    setError(null);
    try {
      await revokeApiKey(revokeKey.id);
      setKeys((prev) =>
        prev.map((k) => (k.id === revokeKey.id ? { ...k, revoked_at: new Date().toISOString() } : k))
      );
      setRevokeOpen(false);
      setRevokeKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke");
    } finally {
      setSaving(false);
    }
  };

  const isRevoked = (key: ApiKey) => !!key.revoked_at;

  const columns: DataTableColumn<ApiKey>[] = [
    { key: "name", label: "Name", render: (row) => row.name },
    {
      key: "scopes",
      label: "Scopes",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.scopes ?? []).map((s) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
          {(row.scopes ?? []).length === 0 && "—"}
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => format(new Date(row.created_at), "yyyy-MM-dd"),
    },
    {
      key: "expires_at",
      label: "Expires",
      render: (row) => (row.expires_at ? format(new Date(row.expires_at), "yyyy-MM-dd") : "Never"),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={isRevoked(row) ? "destructive" : "success"}>
          {isRevoked(row) ? "Revoked" : "Active"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) =>
        !isRevoked(row) ? (
          <Button variant="ghost" size="sm" onClick={() => openRevoke(row)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">API Keys</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Key
        </Button>
      </div>
      {error && <p className="text-destructive">{error}</p>}
      <DataTable
        columns={columns}
        data={keys}
        totalCount={keys.length}
        page={1}
        limit={keys.length || 10}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        loading={loading}
        emptyMessage="No API keys."
      />

      <Modal
        open={createOpen}
        onOpenChange={(open) => !open && closeCreateModal()}
        title={createdSecret ? "Key created" : "Create API Key"}
        description={
          createdSecret
            ? "Copy the key below. It will not be shown again."
            : "Create a new API key with optional scopes and expiry."
        }
        footer={
          createdSecret ? (
            <Button variant="outline" onClick={closeCreateModal}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving || !createName.trim()}>
                {saving ? "Creating..." : "Create"}
              </Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          {createdSecret ? (
            <div className="rounded-lg border-2 border-primary/50 bg-primary/10 p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Secret (show once)</p>
              <code className="block break-all font-mono text-sm text-foreground">
                {createdSecret}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleCopySecret}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? " Copied" : " Copy"}
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="My key"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Scopes</label>
                <div className="flex flex-wrap gap-2">
                  {SCOPES.map((scope) => (
                    <label key={scope} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={createScopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="rounded border-border"
                      />
                      {scope}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Expires in (days, optional)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={createExpiresInDays}
                  onChange={(e) => setCreateExpiresInDays(e.target.value)}
                  placeholder="30"
                />
              </div>
            </>
          )}
        </div>
      </Modal>

      <DangerZone
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revoke API key"
        description={`Revoke "${revokeKey?.name ?? ""}". This cannot be undone.`}
        confirmText="REVOKE"
        onConfirm={handleRevoke}
      />
    </div>
  );
}
