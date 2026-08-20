// Week 2: warehouse adapter.
//
// Production path: this module would issue a request to Cube.dev
// (CUBE_API_URL) which in turn queries the `fct_margin` table dbt built
// in Snowflake. That needs live credentials this sandbox doesn't have.
//
// Dev/demo path (default, no env vars required): we load the same seed
// CSV dbt uses (lib/data/raw_orders.csv, identical to
// dbt-project/seeds/raw_orders.csv) and apply the *exact* transform from
// dbt-project/models/staging/stg_orders.sql + models/marts/fct_margin.sql
// in TypeScript, row for row. Change one, change the other — see tests/.
//
// Swap to production by implementing `fetchFromCube()` and flipping
// WAREHOUSE_MODE=cube in .env.

import { readFileSync } from "fs";
import path from "path";

export interface FctMarginRow {
  order_id: number;
  order_date: string;
  quarter: string;
  region: string;
  revenue: number;
  cost: number;
  margin: number;
  margin_pct: number;
}

function parseCsv(raw: string): Record<string, string>[] {
  const [headerLine, ...lines] = raw.trim().split("\n");
  const headers = headerLine.split(",");
  return lines
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const cells = line.split(",");
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h.trim()] = cells[i]?.trim() ?? ""));
      return row;
    });
}

function toQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}-Q${q}`;
}

let cache: FctMarginRow[] | null = null;

/** Mirrors stg_orders.sql -> fct_margin.sql. */
export function loadFctMargin(): FctMarginRow[] {
  if (cache) return cache;

  const csvPath = path.join(process.cwd(), "lib", "data", "raw_orders.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const rawRows = parseCsv(raw);

  // stg_orders: light cleanup only, no business logic.
  const staged = rawRows.map((r) => ({
    order_id: parseInt(r.order_id, 10),
    order_date: r.order_date,
    region: r.region.trim(),
    revenue: parseFloat(r.revenue),
    cost: parseFloat(r.cost),
  }));

  // fct_margin: the single source of truth for "margin".
  cache = staged.map((r) => {
    const margin = r.revenue - r.cost;
    return {
      order_id: r.order_id,
      order_date: r.order_date,
      quarter: toQuarter(r.order_date),
      region: r.region,
      revenue: r.revenue,
      cost: r.cost,
      margin,
      margin_pct: r.revenue !== 0 ? Math.round((margin / r.revenue) * 10000) / 10000 : 0,
    };
  });

  return cache;
}

/** Test/dev helper to force a reload after the seed file changes. */
export function _resetCache() {
  cache = null;
}
