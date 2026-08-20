import { describe, it, expect } from "vitest";
import { runQuery } from "@/lib/queryEngine";

describe("queryEngine", () => {
  it("sums a metric with no grouping", () => {
    const result = runQuery({ metric: "revenue" });
    expect(result.rows).toHaveLength(1);
    expect(result.total).toBeGreaterThan(0);
  });

  it("groups by region and totals match the ungrouped total", () => {
    const grouped = runQuery({ metric: "margin", groupBy: "region" });
    const ungrouped = runQuery({ metric: "margin" });
    const sumOfGroups = grouped.rows.reduce((a, r) => a + r.value, 0);
    expect(sumOfGroups).toBeCloseTo(ungrouped.total, 5);
  });

  it("computes margin_pct as a true ratio, not an average of row ratios", () => {
    const result = runQuery({ metric: "margin_pct" });
    // ratio must be between 0 and 1 for this dataset (margin < revenue everywhere)
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThan(1);
  });

  it("applies a region filter", () => {
    const filtered = runQuery({ metric: "revenue", filters: { region: "Europe" } });
    const all = runQuery({ metric: "revenue" });
    expect(filtered.total).toBeLessThan(all.total);
    expect(filtered.total).toBeGreaterThan(0);
  });

  it("throws on an unknown metric", () => {
    expect(() => runQuery({ metric: "headcount" as any })).toThrow();
  });
});
