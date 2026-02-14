"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: string;
  children: React.ReactNode;
  className?: string;
}

export function DetailDrawer({
  open,
  onClose,
  title,
  width = "28rem",
  children,
  className,
}: DetailDrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full flex-col border-l border-border bg-card shadow-xl",
          "animate-in slide-in-from-right duration-200",
          className
        )}
        style={{ width }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
