// Week 2: executes a structured query against the governed semantic layer.
// This is the layer Cube.dev's query API would occupy in production.

import { METRICS } from "./semanticLayer";
import { loadFctMargin } from "./warehouseAdapter";
import type { FctMarginRow } from "./warehouseAdapter";

export interface StructuredQuery {
  metric: string; // key into METRICS
  groupBy?: string; // key into DIMENSIONS, e.g. "region"
  filters?: Partial<Record<"region" | "quarter", string>>;
}

export interface QueryResultRow {
  group: string | null;
  value: number;
}

export interface QueryResult {
  metric: string;
  label: string;
  format: string;
  rows: QueryResultRow[];
  total: number;
}

function applyFilters(rows: FctMarginRow[], filters?: StructuredQuery["filters"]): FctMarginRow[] {
  if (!filters) return rows;
  return rows.filter((r) => {
    if (filters.region && r.region.toLowerCase() !== filters.region.toLowerCase()) return false;
    if (filters.quarter && r.quarter.toLowerCase() !== filters.quarter.toLowerCase()) return false;
    return true;
  });
}

function aggregate(rows: FctMarginRow[], metricKey: string): number {
  const def = METRICS[metricKey];
  if (!def) throw new Error(`Unknown metric: ${metricKey}`);

  if (def.agg === "sum") {
    return rows.reduce((acc, r) => acc + (r[def.column as keyof FctMarginRow] as number), 0);
  }
  if (def.agg === "ratio") {
    const num = rows.reduce((acc, r) => acc + (r[def.numerator as keyof FctMarginRow] as number), 0);
    const den = rows.reduce((acc, r) => acc + (r[def.denominator as keyof FctMarginRow] as number), 0);
    return den !== 0 ? num / den : 0;
  }
  throw new Error(`Unsupported aggregation: ${def.agg}`);
}

export function runQuery(query: StructuredQuery): QueryResult {
  const def = METRICS[query.metric];
  if (!def) throw new Error(`Unknown metric: ${query.metric}`);

  const all = loadFctMargin();
  const filtered = applyFilters(all, query.filters);

  if (!query.groupBy) {
    const value = aggregate(filtered, query.metric);
    return { metric: def.key, label: def.label, format: def.format, rows: [{ group: null, value }], total: value };
  }

  const groups = Array.from(new Set(filtered.map((r) => (r as any)[query.groupBy!]))).sort();
  const rows: QueryResultRow[] = groups.map((g) => ({
    group: g,
    value: aggregate(
      filtered.filter((r) => (r as any)[query.groupBy!] === g),
      query.metric
    ),
  }));

  return {
    metric: def.key,
    label: def.label,
    format: def.format,
    rows,
    total: aggregate(filtered, query.metric),
  };
}
