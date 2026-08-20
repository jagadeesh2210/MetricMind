// Week 2: the governed semantic layer.
// Every metric definition here must trace back to dbt-project/models/marts/fct_margin.sql.
// In production this schema is what you'd register in Cube.dev; the shape below
// (name, sql/agg, description) maps 1:1 onto a Cube `measures` block, so swapping
// in a real Cube.dev deployment later just means moving this object into a .yml
// cube definition and pointing CUBE_API_URL at it (see warehouseAdapter.ts).

export type Aggregation = "sum" | "avg" | "ratio";

export interface MetricDef {
  key: string;
  label: string;
  agg: Aggregation;
  column?: string; // for sum/avg
  numerator?: string; // for ratio
  denominator?: string; // for ratio
  format: "currency" | "percent" | "number";
  description: string;
}

export interface DimensionDef {
  key: string;
  label: string;
  column: string;
}

export const METRICS: Record<string, MetricDef> = {
  revenue: {
    key: "revenue",
    label: "Revenue",
    agg: "sum",
    column: "revenue",
    format: "currency",
    description: "Total order revenue.",
  },
  cost: {
    key: "cost",
    label: "Cost",
    agg: "sum",
    column: "cost",
    format: "currency",
    description: "Total order cost.",
  },
  margin: {
    key: "margin",
    label: "Margin",
    agg: "sum",
    column: "margin",
    format: "currency",
    description: "Revenue minus cost.",
  },
  margin_pct: {
    key: "margin_pct",
    label: "Margin %",
    agg: "ratio",
    numerator: "margin",
    denominator: "revenue",
    format: "percent",
    description: "Margin as a percentage of revenue (sum(margin) / sum(revenue)), not an average of row-level percentages.",
  },
};

export const DIMENSIONS: Record<string, DimensionDef> = {
  region: { key: "region", label: "Region", column: "region" },
  quarter: { key: "quarter", label: "Quarter", column: "quarter" },
};

export const GOVERNED_METRIC_KEYS = Object.keys(METRICS);
export const GOVERNED_DIMENSION_KEYS = Object.keys(DIMENSIONS);

export function isGovernedMetric(key: string): boolean {
  return key in METRICS;
}

export function isGovernedDimension(key: string): boolean {
  return key in DIMENSIONS;
}

export function formatValue(value: number, format: MetricDef["format"]): string {
  if (format === "currency") {
    return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  if (format === "percent") {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toLocaleString("en-US");
}
