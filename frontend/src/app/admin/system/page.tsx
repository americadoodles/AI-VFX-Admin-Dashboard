"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Switch from "@radix-ui/react-switch";
import { DangerZone } from "@/components/ui/danger-zone";
import { setIncidentBanner, setMaintenanceMode } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AlertTriangle, Wrench } from "lucide-react";

export default function SystemControlsPage() {
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerDangerOpen, setBannerDangerOpen] = useState(false);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [maintenanceDangerOpen, setMaintenanceDangerOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleSaveBanner = async () => {
    setBannerSaving(true);
    setError(null);
    try {
      await setIncidentBanner({
        message: bannerActive ? bannerMessage || undefined : null,
        severity: bannerActive ? "warning" : null,
      });
      setBannerDangerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save banner");
    } finally {
      setBannerSaving(false);
    }
  };

  const handleSaveMaintenance = async () => {
    setMaintenanceSaving(true);
    setError(null);
    try {
      await setMaintenanceMode({
        enabled: maintenanceEnabled,
        message: maintenanceMessage || undefined,
      });
      setMaintenanceDangerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save maintenance mode");
    } finally {
      setMaintenanceSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-foreground">System Controls</h1>
      {error && <p className="text-destructive">{error}</p>}

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <CardTitle className="text-foreground">Incident Banner</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Current status: {bannerActive ? "Active" : "Inactive"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch.Root
              checked={bannerActive}
              onCheckedChange={setBannerActive}
              className={cn(
                "relative h-6 w-11 rounded-full bg-muted transition-colors",
                "data-[state=checked]:bg-primary"
              )}
            >
              <Switch.Thumb
                className={cn(
                  "block h-5 w-5 rounded-full bg-card shadow transition-transform",
                  "translate-x-0.5 data-[state=checked]:translate-x-[22px]"
                )}
              />
            </Switch.Root>
            <span className="text-sm text-muted-foreground">Active / Inactive</span>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Banner message</label>
            <textarea
              value={bannerMessage}
              onChange={(e) => setBannerMessage(e.target.value)}
              placeholder="Enter incident message..."
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              rows={3}
            />
          </div>
          <DangerZone
            open={bannerDangerOpen}
            onOpenChange={setBannerDangerOpen}
            title="Save incident banner"
            description="This will update the global incident banner shown to users."
            confirmText="SAVE"
            onConfirm={handleSaveBanner}
          />
          <Button onClick={() => setBannerDangerOpen(true)} disabled={bannerSaving}>
            {bannerSaving ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-foreground">Maintenance Mode</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Current status: {maintenanceEnabled ? "Enabled" : "Disabled"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch.Root
              checked={maintenanceEnabled}
              onCheckedChange={setMaintenanceEnabled}
              className={cn(
                "relative h-6 w-11 rounded-full bg-muted transition-colors",
                "data-[state=checked]:bg-warning"
              )}
            >
              <Switch.Thumb
                className={cn(
                  "block h-5 w-5 rounded-full bg-card shadow transition-transform",
                  "translate-x-0.5 data-[state=checked]:translate-x-[22px]"
                )}
              />
            </Switch.Root>
            <span className="text-sm text-muted-foreground">Maintenance mode</span>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Message</label>
            <Input
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="Maintenance message (optional)"
              className="bg-card"
            />
          </div>
          <DangerZone
            open={maintenanceDangerOpen}
            onOpenChange={setMaintenanceDangerOpen}
            title="Save maintenance mode"
            description="This will enable or disable maintenance mode for the platform."
            confirmText="SAVE"
            onConfirm={handleSaveMaintenance}
          />
          <Button onClick={() => setMaintenanceDangerOpen(true)} disabled={maintenanceSaving}>
            {maintenanceSaving ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
