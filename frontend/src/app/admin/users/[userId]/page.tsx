"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  getUser,
  getUserTokens,
  getEvents,
  suspendUser,
  unsuspendUser,
  resetMFA,
  revokeSessions,
  impersonateUser,
} from "@/lib/api";
import type { User, TokenTransaction, EventLog } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DangerZone } from "@/components/ui/danger-zone";
import { StepUpAuthDialog } from "@/components/ui/step-up-auth";
import { GrantTokensModal } from "@/components/users/grant-tokens-modal";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";
import {
  ArrowLeft,
  MoreHorizontal,
  Check,
  X,
  UserX,
  UserCheck,
  KeyRound,
  LogOut,
  Download,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [projectCount, setProjectCount] = useState(0);
  const [generationCount, setGenerationCount] = useState(0);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [unsuspendModalOpen, setUnsuspendModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [stepUpCallback, setStepUpCallback] = useState<(() => void) | null>(null);

  const loadUser = () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    getUser(userId)
      .then((res) => {
        setUser(res.user);
        setTokenBalance(res.token_balance);
        setProjectCount(res.project_count);
        setGenerationCount(res.generation_count);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load user"))
      .finally(() => setLoading(false));
  };

  const loadTokens = () => {
    if (!userId) return;
    getUserTokens(userId, 1, 50)
      .then((res) => setTransactions(res.transactions ?? []))
      .catch(() => setTransactions([]));
  };

  const loadEvents = () => {
    if (!userId) return;
    getEvents({ user_id: userId, limit: 50 })
      .then((res) => setEvents(res.items ?? []))
      .catch(() => setEvents([]));
  };

  useEffect(() => {
    loadUser();
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadTokens();
      loadEvents();
    }
  }, [userId]);

  const handleStepUp = (callback: () => void) => {
    setStepUpCallback(() => callback);
    setStepUpOpen(true);
  };

  const onStepUpSuccess = () => {
    stepUpCallback?.();
    setStepUpCallback(null);
    setStepUpOpen(false);
  };

  const handleSuspend = async (reason?: string) => {
    if (!userId || !reason) return;
    try {
      await suspendUser(userId, reason);
      toast("User suspended.", "success");
      setSuspendModalOpen(false);
      loadUser();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to suspend user.", "error");
    }
  };

  const handleUnsuspend = async () => {
    if (!userId) return;
    try {
      await unsuspendUser(userId);
      toast("User unsuspended.", "success");
      setUnsuspendModalOpen(false);
      loadUser();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to unsuspend user.", "error");
    }
  };

  const handleResetMFA = () => {
    handleStepUp(async () => {
      try {
        await resetMFA(userId);
        toast("MFA reset.", "success");
        loadUser();
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to reset MFA.", "error");
      }
    });
  };

  const handleRevokeSessions = () => {
    handleStepUp(async () => {
      try {
        await revokeSessions(userId);
        toast("All sessions revoked.", "success");
      } catch (err) {
        toast(err instanceof Error ? err.message : "Failed to revoke sessions.", "error");
      }
    });
  };

  const handleImpersonate = async () => {
    try {
      const res = await impersonateUser(userId);
      toast("Impersonation token generated. Use it to sign in as this user.", "info");
      if (res.impersonation_token) {
        localStorage.setItem("admin_impersonation_token", res.impersonation_token);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to impersonate.", "error");
    }
  };

  const handleExportData = () => {
    toast("Export not implemented in this demo.", "info");
  };

  const handleDeleteUser = async () => {
    toast("Delete user API is not available in this client.", "warning");
    setDeleteModalOpen(false);
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (loading && !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!user) return null;

  const isSuspended = user.status?.toLowerCase() === "suspended";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Link>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="outline" size="icon" aria-label="Actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[200px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
              sideOffset={6}
              align="end"
            >
              {isSuspended ? (
                <DropdownMenu.Item
                  className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  onSelect={() => setUnsuspendModalOpen(true)}
                >
                  <UserCheck className="mr-2 h-4 w-4" /> Unsuspend User
                </DropdownMenu.Item>
              ) : (
                <DropdownMenu.Item
                  className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  onSelect={() => setSuspendModalOpen(true)}
                >
                  <UserX className="mr-2 h-4 w-4" /> Suspend User
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Item
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                onSelect={handleResetMFA}
              >
                <KeyRound className="mr-2 h-4 w-4" /> Reset MFA
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                onSelect={handleRevokeSessions}
              >
                <LogOut className="mr-2 h-4 w-4" /> Revoke Sessions
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                onSelect={handleExportData}
              >
                <Download className="mr-2 h-4 w-4" /> Export Data
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm text-destructive outline-none data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
                onSelect={() => setDeleteModalOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete User
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* User header */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{user.email}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={user.status} />
            <Badge variant="secondary" className="capitalize">
              {user.plan}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Joined {formatDate(user.created_at)}
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-foreground">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Email:</span> {user.email}</p>
                <p><span className="text-muted-foreground">Name:</span> {user.name || "—"}</p>
                <p>
                  <span className="text-muted-foreground">Verified:</span>{" "}
                  {user.verified_at ? (
                    <span className="text-success">Yes</span>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </p>
                <p>
                  <span className="text-muted-foreground">MFA:</span>{" "}
                  {user.mfa_enabled ? <Check className="inline h-4 w-4 text-success" /> : <X className="inline h-4 w-4 text-muted-foreground" />}
                </p>
                <p><span className="text-muted-foreground">Linked providers:</span> {user.linked_providers?.length ? user.linked_providers.join(", ") : "—"}</p>
                <p><span className="text-muted-foreground">Org ID:</span> {user.org_id || "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-foreground">Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Projects:</span> {projectCount}</p>
                <p><span className="text-muted-foreground">Storage used:</span> {(user.storage_used_bytes / 1024 / 1024).toFixed(2)} MB</p>
                <p><span className="text-muted-foreground">Generations (total):</span> {generationCount}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">Token balance</CardTitle>
              <Button onClick={() => setGrantModalOpen(true)}>Grant Tokens</Button>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{tokenBalance.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Recent transactions (last 50)</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-foreground">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 pr-4">Date</th>
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2 pr-4">Amount</th>
                        <th className="pb-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border">
                          <td className="py-2 pr-4">{formatDateTime(tx.created_at)}</td>
                          <td className="py-2 pr-4">{tx.type}</td>
                          <td className={cn("py-2 pr-4", tx.amount >= 0 ? "text-success" : "text-destructive")}>
                            {tx.amount >= 0 ? "+" : ""}{tx.amount}
                          </td>
                          <td className="py-2">{tx.reason || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Event timeline</CardTitle>
              <p className="text-sm text-muted-foreground">Recent activity for this user</p>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events.</p>
              ) : (
                <ul className="space-y-2">
                  {events.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-start justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium text-foreground">{ev.type}</span>
                        {ev.payload_json && Object.keys(ev.payload_json).length > 0 && (
                          <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                            {JSON.stringify(ev.payload_json)}
                          </pre>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo(ev.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">MFA</CardTitle>
              <p className="text-sm text-muted-foreground">Multi-factor authentication status</p>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm">
                {user.mfa_enabled ? (
                  <span className="text-success">Enabled</span>
                ) : (
                  <span className="text-muted-foreground">Not enabled</span>
                )}
              </p>
              <Button variant="outline" size="sm" onClick={handleResetMFA}>
                Reset MFA
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Sessions</CardTitle>
              <p className="text-sm text-muted-foreground">Revoke all active sessions for this user</p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={handleRevokeSessions}>
                Revoke All
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Account actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {isSuspended ? (
                <Button variant="outline" onClick={() => setUnsuspendModalOpen(true)}>
                  Unsuspend User
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setSuspendModalOpen(true)}>
                  Suspend User
                </Button>
              )}
              <Button variant="outline" onClick={handleImpersonate}>
                Impersonate
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <GrantTokensModal
        open={grantModalOpen}
        onOpenChange={setGrantModalOpen}
        userId={userId}
        onSuccess={() => { loadUser(); loadTokens(); }}
      />

      <DangerZone
        open={suspendModalOpen}
        onOpenChange={setSuspendModalOpen}
        title="Suspend user"
        description="This user will not be able to sign in until unsuspended."
        confirmText="SUSPEND"
        requireReason
        onConfirm={handleSuspend}
      />

      <DangerZone
        open={unsuspendModalOpen}
        onOpenChange={setUnsuspendModalOpen}
        title="Unsuspend user"
        description="This user will be able to sign in again."
        confirmText="UNSUSPEND"
        onConfirm={handleUnsuspend}
      />

      <DangerZone
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete user"
        description="Permanently delete this user and their data. This cannot be undone."
        confirmText="DELETE USER"
        requireReason
        onConfirm={handleDeleteUser}
      />

      <StepUpAuthDialog
        open={stepUpOpen}
        onSuccess={onStepUpSuccess}
        onCancel={() => { setStepUpOpen(false); setStepUpCallback(null); }}
      />
    </div>
  );
}
