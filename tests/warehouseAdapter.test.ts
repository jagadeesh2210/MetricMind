import { describe, it, expect } from "vitest";
import { loadFctMargin } from "@/lib/warehouseAdapter";

describe("warehouseAdapter (mirrors dbt fct_margin.sql)", () => {
  const rows = loadFctMargin();

  it("loads all seed rows", () => {
    expect(rows.length).toBe(10);
  });

  it("computes margin as revenue - cost", () => {
    for (const r of rows) {
      expect(r.margin).toBeCloseTo(r.revenue - r.cost, 5);
    }
  });

  it("computes margin_pct as margin / revenue, rounded to 4dp", () => {
    const first = rows[0]; // order_id 1: revenue 12000, cost 8000
    expect(first.margin).toBe(4000);
    expect(first.margin_pct).toBeCloseTo(4000 / 12000, 4);
  });

  it("buckets order_date into a year-quarter string", () => {
    for (const r of rows) {
      expect(r.quarter).toMatch(/^\d{4}-Q[1-4]$/);
    }
  });
});
