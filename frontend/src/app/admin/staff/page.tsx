"use client";

import { useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { DangerZone } from "@/components/ui/danger-zone";
import { getStaff, createStaff, updateStaff } from "@/lib/api";
import type { StaffUser as StaffUserType } from "@/lib/types";
import { format } from "date-fns";
import { Plus, Pencil, UserX } from "lucide-react";

const ROLES = ["admin", "support", "viewer"];

export default function StaffAccountsPage() {
  const [staff, setStaff] = useState<StaffUserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffUserType | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateStaff, setDeactivateStaff] = useState<StaffUserType | null>(null);
  const [saving, setSaving] = useState(false);

  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRoles, setAddRoles] = useState<string[]>([]);

  const [editRoles, setEditRoles] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getStaff()
      .then((res) => {
        if (!cancelled) setStaff(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load staff");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, []);

  const toggleAddRole = (role: string) => {
    setAddRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const toggleEditRole = (role: string) => {
    setEditRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      const created = await createStaff({
        email: addEmail,
        name: addName,
        password: addPassword,
        role_names: addRoles.length ? addRoles : undefined,
      });
      setStaff((prev) => [...prev, created]);
      setAddOpen(false);
      setAddEmail("");
      setAddName("");
      setAddPassword("");
      setAddRoles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add staff");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (s: StaffUserType) => {
    setEditStaff(s);
    setEditRoles(s.roles ?? []);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editStaff) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateStaff(editStaff.id, { role_names: editRoles });
      setStaff((prev) => prev.map((x) => (x.id === editStaff.id ? updated : x)));
      setEditOpen(false);
      setEditStaff(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const openDeactivate = (s: StaffUserType) => {
    setDeactivateStaff(s);
    setDeactivateOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivateStaff) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateStaff(deactivateStaff.id, { is_active: false });
      setStaff((prev) => prev.map((x) => (x.id === deactivateStaff.id ? updated : x)));
      setDeactivateOpen(false);
      setDeactivateStaff(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate");
    } finally {
      setSaving(false);
    }
  };

  const columns: DataTableColumn<StaffUserType>[] = [
    { key: "email", label: "Email", render: (row) => row.email },
    { key: "name", label: "Name", render: (row) => row.name ?? "—" },
    {
      key: "roles",
      label: "Roles",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.roles ?? []).map((r) => (
            <Badge key={r} variant="secondary">
              {r}
            </Badge>
          ))}
          {(row.roles ?? []).length === 0 && "—"}
        </div>
      ),
    },
    {
      key: "is_active",
      label: "Active",
      render: (row) => <StatusBadge status={row.is_active ? "active" : "inactive"} />,
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => format(new Date(row.created_at), "yyyy-MM-dd"),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          {row.is_active && (
            <Button variant="ghost" size="sm" onClick={() => openDeactivate(row)}>
              <UserX className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Staff Accounts</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>
      {error && <p className="text-destructive">{error}</p>}
      <DataTable
        columns={columns}
        data={staff}
        totalCount={staff.length}
        page={1}
        limit={staff.length || 10}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        loading={loading}
        emptyMessage="No staff accounts."
      />

      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Staff"
        description="Create a new staff account."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving || !addEmail || !addPassword}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="staff@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
            <Input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
            <Input
              type="password"
              value={addPassword}
              onChange={(e) => setAddPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Roles</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={addRoles.includes(role)}
                    onChange={() => toggleAddRole(role)}
                    className="rounded border-border"
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Staff"
        description="Update roles."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {editStaff && (
            <>
              <p className="text-sm text-muted-foreground">{editStaff.email}</p>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editRoles.includes(role)}
                        onChange={() => toggleEditRole(role)}
                        className="rounded border-border"
                      />
                      {role}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      <DangerZone
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate staff"
        description="This will deactivate the staff account. They will no longer be able to sign in."
        confirmText="DEACTIVATE"
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
