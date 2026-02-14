"use client";

import { useEffect, useState, useCallback } from "react";
import { FilterBar } from "@/components/ui/filter-bar";
import { DetailDrawer } from "@/components/ui/detail-drawer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAssets, flagAsset, type AssetsParams } from "@/lib/api";
import type { MediaAsset } from "@/lib/types";
import { format } from "date-fns";
import { ImageIcon, Film, FileQuestion } from "lucide-react";

const KIND_OPTIONS = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "reference", label: "Reference" },
];

const SOURCE_OPTIONS = [
  { value: "upload", label: "Upload" },
  { value: "generated", label: "Generated" },
];

export default function ContentBrowserPage() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 24;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    kind: "",
    source: "",
    flagged: "",
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [flagging, setFlagging] = useState(false);

  const fetchAssets = useCallback(() => {
    setLoading(true);
    const params: AssetsParams = {
      page,
      limit,
      kind: filterValues.kind || undefined,
      source: filterValues.source || undefined,
      flagged: filterValues.flagged === "true" ? true : filterValues.flagged === "false" ? false : undefined,
      search: search.trim() || undefined,
    };
    getAssets(params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load assets");
      })
      .finally(() => setLoading(false));
  }, [page, limit, filterValues.kind, filterValues.source, filterValues.flagged, search]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleClear = () => {
    setSearch("");
    setFilterValues({ kind: "", source: "", flagged: "" });
    setPage(1);
  };

  const handleAssetClick = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    setDrawerOpen(true);
  };

  const handleFlag = async () => {
    if (!selectedAsset) return;
    setFlagging(true);
    try {
      await flagAsset(selectedAsset.id);
      setSelectedAsset((prev) => (prev ? { ...prev, flagged: true } : null));
      fetchAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flag failed");
    } finally {
      setFlagging(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const ThumbIcon = ({ kind }: { kind: string }) => {
    if (kind === "video") return <Film className="h-12 w-12 text-muted-foreground" />;
    if (kind === "image") return <ImageIcon className="h-12 w-12 text-muted-foreground" />;
    return <FileQuestion className="h-12 w-12 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Content Browser</h1>
      {error && <p className="text-destructive">{error}</p>}
      <FilterBar
        searchPlaceholder="Search..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { key: "kind", label: "Kind", options: KIND_OPTIONS },
          { key: "source", label: "Source", options: SOURCE_OPTIONS },
          {
            key: "flagged",
            label: "Flagged",
            options: [
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ],
          },
        ]}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onClear={handleClear}
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No assets found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((asset) => (
            <Card
              key={asset.id}
              className="cursor-pointer overflow-hidden border-border bg-card transition-colors hover:bg-muted/50"
              onClick={() => handleAssetClick(asset)}
            >
              <div className="relative aspect-square bg-muted flex items-center justify-center">
                {asset.url ? (
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ThumbIcon kind={asset.kind} />
                )}
                {asset.flagged && (
                  <Badge variant="destructive" className="absolute right-2 top-2">
                    Flagged
                  </Badge>
                )}
              </div>
              <CardContent className="p-2">
                <p className="truncate text-xs font-medium text-foreground">{asset.filename}</p>
                <p className="text-xs text-muted-foreground">{asset.user_id.slice(0, 8)}...</p>
                <p className="text-xs text-muted-foreground">
                  {(asset.size_bytes / 1024).toFixed(1)} KB · {format(new Date(asset.created_at), "MMM d")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <DetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedAsset?.filename ?? "Asset details"}
        width="28rem"
      >
        {selectedAsset && (
          <div className="space-y-4">
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">ID:</span> {selectedAsset.id}</p>
              <p><span className="text-muted-foreground">User:</span> {selectedAsset.user_id}</p>
              <p><span className="text-muted-foreground">Kind:</span> {selectedAsset.kind}</p>
              <p><span className="text-muted-foreground">Source:</span> {selectedAsset.source}</p>
              <p><span className="text-muted-foreground">Size:</span>{(selectedAsset.size_bytes / 1024).toFixed(1)} KB</p>
              <p><span className="text-muted-foreground">Created:</span> {format(new Date(selectedAsset.created_at), "PPpp")}</p>
              {selectedAsset.flagged && (
                <p><Badge variant="destructive">Flagged</Badge> {selectedAsset.flag_reason ?? ""}</p>
              )}
            </div>
            {!selectedAsset.flagged && (
              <Button variant="destructive" size="sm" onClick={handleFlag} disabled={flagging}>
                {flagging ? "Flagging..." : "Flag"}
              </Button>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
