"use client";

import { useEffect, useState, useCallback } from "react";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DetailDrawer } from "@/components/ui/detail-drawer";
import { JSONViewer } from "@/components/ui/json-viewer";
import { Badge } from "@/components/ui/badge";
import { getEvents, type EventsParams } from "@/lib/api";
import type { EventLog } from "@/lib/types";
import { format } from "date-fns";

const EVENT_TYPE_OPTIONS = [
  { value: "login", label: "Login" },
  { value: "generation_start", label: "Generation Start" },
  { value: "generation_complete", label: "Generation Complete" },
  { value: "project_create", label: "Project Create" },
  { value: "project_delete", label: "Project Delete" },
  { value: "upload", label: "Upload" },
  { value: "api_call", label: "API Call" },
];

export default function ActivityExplorerPage() {
  const [items, setItems] = useState<EventLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    type: "",
    user_id: "",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventLog | null>(null);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    const params: EventsParams = {
      page,
      limit,
      type: filterValues.type || undefined,
      user_id: filterValues.user_id || undefined,
      search: search.trim() || undefined,
    };
    getEvents(params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load events");
      })
      .finally(() => setLoading(false));
  }, [page, limit, filterValues.type, filterValues.user_id, search]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClear = () => {
    setSearch("");
    setFilterValues({ type: "", user_id: "" });
    setPage(1);
  };

  const handleRowClick = (row: EventLog) => {
    setSelectedEvent(row);
    setDrawerOpen(true);
  };

  const detailsPayload = selectedEvent?.payload_json ?? {};
  const detailsStr = JSON.stringify(detailsPayload);
  const truncated =
    detailsStr.length > 60 ? detailsStr.slice(0, 57) + "..." : detailsStr;

  const columns: DataTableColumn<EventLog>[] = [
    {
      key: "created_at",
      label: "Timestamp",
      render: (row) => format(new Date(row.created_at), "yyyy-MM-dd HH:mm:ss"),
    },
    {
      key: "type",
      label: "Event Type",
      render: (row) => (
        <Badge variant="secondary" className="capitalize">
          {row.type.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "user_id",
      label: "User",
      render: (row) => row.user_id ?? "—",
    },
    {
      key: "project_id",
      label: "Project",
      render: (row) => row.project_id ?? "—",
    },
    {
      key: "payload_json",
      label: "Details",
      render: (row) => (
        <span className="max-w-[200px] truncate block text-muted-foreground">
          {row.payload_json
            ? (JSON.stringify(row.payload_json).length > 60
                ? JSON.stringify(row.payload_json).slice(0, 57) + "..."
                : JSON.stringify(row.payload_json))
            : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Activity Explorer</h1>
      {error && <p className="text-destructive">{error}</p>}
      <FilterBar
        searchPlaceholder="Full-text search..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { key: "type", label: "Event type", options: EVENT_TYPE_OPTIONS },
          { key: "user_id", label: "User ID", options: [] }
        ]}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onClear={handleClear}
      />
      <DataTable
        columns={columns}
        data={items}
        totalCount={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        loading={loading}
        onRowClick={handleRowClick}
        emptyMessage="No events found."
      />
      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedEvent ? `Event: ${selectedEvent.type}` : "Event details"}
        width="32rem"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {format(new Date(selectedEvent.created_at), "PPpp")} · ID: {selectedEvent.id}
            </div>
            <JSONViewer data={detailsPayload} defaultExpanded={2} />
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
