"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Avatar from "@radix-ui/react-avatar";
import {
  LayoutDashboard,
  Users,
  Coins,
  Activity,
  Shield,
  Cpu,
  Image,
  HardDrive,
  Boxes,
  Flag,
  Gauge,
  Settings,
  UserCog,
  Key,
  ChevronLeft,
  ChevronRight,
  Bell,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 64;

const NAV_ITEMS: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/tokens", label: "Tokens & Billing", icon: Coins },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: Shield },
  { href: "/admin/generation-jobs", label: "Generation Jobs", icon: Cpu },
  { href: "/admin/content", label: "Content", icon: Image },
  { href: "/admin/storage", label: "Storage", icon: HardDrive },
];

const NAV_ITEMS_2: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/admin/models", label: "Models", icon: Boxes },
  { href: "/admin/feature-flags", label: "Feature Flags", icon: Flag },
  { href: "/admin/rate-limits", label: "Rate Limits", icon: Gauge },
  { href: "/admin/system", label: "System Controls", icon: Settings },
];

const NAV_ITEMS_3: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/admin/staff", label: "Staff", icon: UserCog },
  { href: "/admin/api-keys", label: "API Keys", icon: Key },
];

const ROUTE_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/users": "Users",
  "/admin/tokens": "Tokens & Billing",
  "/admin/activity": "Activity",
  "/admin/audit-logs": "Audit Logs",
  "/admin/generation-jobs": "Generation Jobs",
  "/admin/content": "Content",
  "/admin/storage": "Storage",
  "/admin/models": "Models",
  "/admin/feature-flags": "Feature Flags",
  "/admin/rate-limits": "Rate Limits",
  "/admin/system": "System Controls",
  "/admin/staff": "Staff",
  "/admin/api-keys": "API Keys",
};

function getBreadcrumbs(pathname: string): { href: string; label: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let acc = "";
  for (let i = 0; i < segments.length; i++) {
    acc += "/" + segments[i];
    const label = i === 0 ? ROUTE_LABELS[acc] ?? "Admin" : segments[i];
    crumbs.push({ href: acc, label: label ?? acc });
  }
  return crumbs;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
  const breadcrumbs = getBreadcrumbs(pathname);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-background">
      <aside
        className="flex shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200"
        style={{ width }}
      >
        <div className="flex h-14 items-center border-b border-border px-3">
          {!collapsed && (
            <Link href="/admin" className="font-semibold text-foreground">
              VFX Admin
            </Link>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="space-y-1 px-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive(href)
                    ? "bg-sidebar-active text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            ))}
          </div>
          <Separator className="my-2 bg-border" />
          <div className="space-y-1 px-2">
            {NAV_ITEMS_2.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive(href)
                    ? "bg-sidebar-active text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            ))}
          </div>
          <Separator className="my-2 bg-border" />
          <div className="space-y-1 px-2">
            {NAV_ITEMS_3.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive(href)
                    ? "bg-sidebar-active text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-2">
                {i > 0 && <span>/</span>}
                <Link
                  href={crumb.href}
                  className={i === breadcrumbs.length - 1 ? "font-medium text-foreground" : "hover:text-foreground"}
                >
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full outline-none ring-ring focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
                  aria-label="User menu"
                >
                  <Avatar.Root className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground">
                    <Avatar.Image src="" alt={user?.name ?? user?.email ?? "User"} />
                    <Avatar.Fallback className="text-sm font-medium">
                      {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <span className="text-sm text-foreground">{user?.email}</span>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[180px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
                  sideOffset={6}
                  align="end"
                >
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    onSelect={() => logout()}
                  >
                    Log out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
