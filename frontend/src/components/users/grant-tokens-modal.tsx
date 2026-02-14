"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepUpAuthDialog } from "@/components/ui/step-up-auth";
import { grantTokens } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface GrantTokensModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export function GrantTokensModal({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: GrantTokensModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepUpOpen, setStepUpOpen] = useState(false);

  const amountNum = parseInt(amount, 10);
  const isValid = !isNaN(amountNum) && amountNum > 0 && reason.trim().length > 0;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setAmount("");
      setReason("");
    }
    onOpenChange(next);
  };

  const handleConfirmGrant = () => {
    if (!isValid) return;
    setStepUpOpen(true);
  };

  const onStepUpSuccess = async () => {
    setStepUpOpen(false);
    setLoading(true);
    try {
      await grantTokens(userId, amountNum, reason.trim());
      toast("Tokens granted successfully.", "success");
      handleOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to grant tokens.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title="Grant tokens"
        description="Add tokens to this user's balance. A reason is required for audit."
        footer={
          <>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmGrant}
              disabled={!isValid || loading}
            >
              Grant tokens
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Amount</label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Promotional credit, support compensation"
              className={cn(
                "flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
              rows={3}
              disabled={loading}
            />
          </div>
        </div>
      </Modal>
      <StepUpAuthDialog
        open={stepUpOpen}
        onSuccess={onStepUpSuccess}
        onCancel={() => setStepUpOpen(false)}
      />
    </>
  );
}
