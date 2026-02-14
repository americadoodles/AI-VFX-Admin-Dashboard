"use client";

import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Button } from "./button";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, X } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FilterConfig[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClear: () => void;
  className?: string;
}

export function FilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters,
  filterValues,
  onFilterChange,
  onClear,
  className,
}: FilterBarProps) {
  const hasActiveFilters =
    searchValue.trim() !== "" || Object.values(filterValues).some((v) => v !== "");

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Input
        type="search"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-64"
      />
      {filters.map((filter) => (
        <SelectPrimitive.Root
          key={filter.key}
          value={filterValues[filter.key] || "__all__"}
          onValueChange={(value) =>
            onFilterChange(filter.key, value === "__all__" ? "" : value)
          }
        >
          <SelectPrimitive.Trigger
            className={cn(
              "inline-flex h-9 min-w-[120px] items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-1 text-sm text-foreground shadow-sm",
              "hover:bg-accent hover:text-accent-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            )}
          >
            <SelectPrimitive.Value placeholder={filter.label} />
            <SelectPrimitive.Icon>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className="z-50 min-w-32 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.Item
                value="__all__"
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
              >
                <SelectPrimitive.ItemText>All</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
              {filter.options.map((opt) => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      ))}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
