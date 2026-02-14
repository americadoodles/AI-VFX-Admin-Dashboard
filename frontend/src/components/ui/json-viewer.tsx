"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown } from "lucide-react";

const KEY_CLASS = "text-purple-400";
const STRING_CLASS = "text-green-500";
const NUMBER_CLASS = "text-orange-400";
const BOOLEAN_CLASS = "text-blue-400";
const NULL_CLASS = "text-muted-foreground";

function JsonNode({
  data,
  keyName,
  depth,
  defaultExpanded = 1,
}: {
  data: unknown;
  keyName?: string;
  depth: number;
  defaultExpanded?: number;
}) {
  const [expanded, setExpanded] = useState(depth < defaultExpanded);

  if (data === null) {
    return (
      <span>
        {keyName != null && <span className={KEY_CLASS}>"{keyName}"</span>}
        <span className={NULL_CLASS}> null</span>
      </span>
    );
  }

  if (typeof data === "boolean") {
    return (
      <span>
        {keyName != null && <span className={KEY_CLASS}>"{keyName}"</span>}
        <span className={BOOLEAN_CLASS}> {String(data)}</span>
      </span>
    );
  }

  if (typeof data === "number") {
    return (
      <span>
        {keyName != null && <span className={KEY_CLASS}>"{keyName}"</span>}
        <span className={NUMBER_CLASS}> {data}</span>
      </span>
    );
  }

  if (typeof data === "string") {
    return (
      <span>
        {keyName != null && <span className={KEY_CLASS}>"{keyName}"</span>}
        <span className={STRING_CLASS}> "{data}"</span>
      </span>
    );
  }

  if (Array.isArray(data)) {
    const toggle = () => setExpanded((e) => !e);
    return (
      <div className="pl-0">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-0.5 text-left hover:opacity-80"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {keyName != null && <span className={KEY_CLASS}>"{keyName}"</span>}
          <span className="text-muted-foreground"> [{data.length}]</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-border pl-2">
            {data.map((item, i) => (
              <div key={i}>
                <JsonNode
                  data={item}
                  depth={depth + 1}
                  defaultExpanded={defaultExpanded}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === "object" && data !== null) {
    const toggle = () => setExpanded((e) => !e);
    const keys = Object.keys(data as Record<string, unknown>);
    return (
      <div className="pl-0">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-0.5 text-left hover:opacity-80"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {keyName != null && <span className={KEY_CLASS}>"{keyName}"</span>}
          <span className="text-muted-foreground"> {"{"}</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-border pl-2">
            {keys.map((k) => (
              <div key={k}>
                <JsonNode
                  keyName={k}
                  data={(data as Record<string, unknown>)[k]}
                  depth={depth + 1}
                  defaultExpanded={defaultExpanded}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export interface JSONViewerProps {
  data: unknown;
  defaultExpanded?: number;
  className?: string;
}

export function JSONViewer({ data, defaultExpanded = 1, className }: JSONViewerProps) {
  return (
    <pre
      className={cn(
        "overflow-auto rounded-md border border-border bg-card p-4 font-mono text-sm",
        className
      )}
    >
      <JsonNode data={data} depth={0} defaultExpanded={defaultExpanded} />
    </pre>
  );
}
