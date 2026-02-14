"use client";

import { useState } from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export interface DangerZoneProps {
  title: string;
  description: string;
  confirmText: string;
  onConfirm: (reason?: string) => void | Promise<void>;
  requireReason?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DangerZone({
  title,
  description,
  confirmText,
  onConfirm,
  requireReason = false,
  open,
  onOpenChange,
}: DangerZoneProps) {
  const [typedConfirm, setTypedConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const canConfirm =
    typedConfirm === confirmText && (!requireReason || reason.trim().length > 0);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      onOpenChange(false);
      setTypedConfirm("");
      setReason("");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTypedConfirm("");
      setReason("");
    }
    onOpenChange(next);
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
          >
            {loading ? "Confirming..." : "Confirm"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-foreground">
            This action cannot be undone. Type <strong className="text-destructive">{confirmText}</strong> to confirm.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Type &quot;{confirmText}&quot; to confirm
          </label>
          <Input
            value={typedConfirm}
            onChange={(e) => setTypedConfirm(e.target.value)}
            placeholder={confirmText}
            className={cn(typedConfirm && typedConfirm !== confirmText && "border-destructive")}
          />
        </div>
        {requireReason && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this action is being taken..."
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
              rows={3}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
