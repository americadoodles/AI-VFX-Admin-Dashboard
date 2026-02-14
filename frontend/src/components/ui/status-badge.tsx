import { cn } from "@/lib/utils";
import { Badge } from "./badge";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  active: "success",
  completed: "success",
  success: "success",
  suspended: "destructive",
  failed: "destructive",
  error: "destructive",
  pending: "warning",
  warning: "warning",
  deleted: "secondary",
  cancelled: "secondary",
  running: "default",
  in_progress: "default",
};

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status?.toLowerCase().replace(/\s/g, "_") ?? "";
  const variant = STATUS_VARIANT[normalized] ?? "outline";
  const label = status ?? "—";

  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {label}
    </Badge>
  );
}
