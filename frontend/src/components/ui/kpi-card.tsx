"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "./card";
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";

export interface KPICardProps {
  label: string;
  value: string | number;
  trend?: { direction: "up" | "down" | "flat"; value: string };
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function KPICard({ label, value, trend, icon: Icon, onClick, className }: KPICardProps) {
  const TrendIcon =
    trend?.direction === "up" ? ArrowUp : trend?.direction === "down" ? ArrowDown : Minus;
  const trendColor =
    trend?.direction === "up"
      ? "text-success"
      : trend?.direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <Card
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {trend && (
          <div className={cn("mt-1 flex items-center gap-1 text-xs", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span>{trend.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
