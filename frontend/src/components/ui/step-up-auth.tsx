"use client";

import { useState } from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Input } from "./input";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export interface StepUpAuthDialogProps {
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function StepUpAuthDialog({ open, onSuccess, onCancel }: StepUpAuthDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:8000/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email ?? "", password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? "Invalid password. Please try again.");
        return;
      }
      onSuccess();
      setPassword("");
      setError("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassword("");
      setError("");
      onCancel();
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Re-enter your password"
      description="For your security, please enter your password to continue."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="step-up-password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            id="step-up-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            disabled={loading}
            className={cn(error && "border-destructive")}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Continue"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
