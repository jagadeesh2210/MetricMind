import { describe, it, expect } from "vitest";
import { parseMessage } from "@/lib/nlu";

describe("nlu.parseMessage", () => {
  it("extracts a metric with no modifiers", () => {
    const r = parseMessage("what's our revenue?");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.query.metric).toBe("revenue");
  });

  it("extracts groupBy from 'by region'", () => {
    const r = parseMessage("show margin by region");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.query.metric).toBe("margin");
      expect(r.query.groupBy).toBe("region");
    }
  });

  it("recognizes margin % as margin_pct, not margin", () => {
    const r = parseMessage("what's our margin % this quarter");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.query.metric).toBe("margin_pct");
  });

  it("extracts a region filter", () => {
    const r = parseMessage("cost in Asia");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.query.filters?.region).toBe("Asia");
  });

  it("extracts a quarter filter like Q1 2026", () => {
    const r = parseMessage("revenue in Q1 2026");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.query.filters?.quarter).toBe("2026-Q1");
  });

  it("reuses the last metric on a follow-up with no metric of its own", () => {
    const r = parseMessage("now break it down by region", { lastMetric: "cost" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.query.metric).toBe("cost");
      expect(r.query.groupBy).toBe("region");
    }
  });

  it("fails with no_metric when nothing governed is mentioned and there's no context", () => {
    const r = parseMessage("how's the weather");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_metric");
  });
});
