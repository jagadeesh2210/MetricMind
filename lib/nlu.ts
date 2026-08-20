// Week 2/3: the "agentic" orchestrator.
//
// Deliberately rule-based, not an LLM call — it's transparent, testable,
// and free to run in review. Every decision it makes is inspectable.
// To upgrade to a real LLM-driven agent (LangChain, per the README),
// implement `llmParse()` below and have `parseMessage()` fall back to it
// when the rule-based parser can't confidently extract a metric; keep the
// guardrail check (Week 3) downstream of either path so ungoverned
// metrics are still rejected regardless of who/what parsed the question.

import { GOVERNED_METRIC_KEYS } from "./semanticLayer";
import type { StructuredQuery } from "./queryEngine";

export interface ConversationContext {
  lastMetric?: string;
  lastGroupBy?: string;
  lastFilters?: StructuredQuery["filters"];
}

const METRIC_SYNONYMS: Record<string, string> = {
  revenue: "revenue",
  sales: "revenue",
  income: "revenue",
  cost: "cost",
  costs: "cost",
  expense: "cost",
  expenses: "cost",
  margin: "margin",
  profit: "margin",
  "margin %": "margin_pct",
  "margin percent": "margin_pct",
  "margin percentage": "margin_pct",
  profitability: "margin_pct",
};

const REGIONS = ["europe", "north america", "asia"];
const DIMENSION_WORDS: Record<string, string> = {
  region: "region",
  regions: "region",
  quarter: "quarter",
  quarters: "quarter",
};

function findMetric(lower: string): string | undefined {
  // Longest synonyms first so "margin %" beats "margin".
  const keys = Object.keys(METRIC_SYNONYMS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (lower.includes(k)) return METRIC_SYNONYMS[k];
  }
  return undefined;
}

function findGroupBy(lower: string): string | undefined {
  for (const word of Object.keys(DIMENSION_WORDS)) {
    if (
      lower.includes(`by ${word}`) ||
      lower.includes(`per ${word}`) ||
      lower.includes(`broken down by ${word}`) ||
      lower.includes(`break it down by ${word}`) ||
      lower.includes(`breakdown by ${word}`)
    ) {
      return DIMENSION_WORDS[word];
    }
  }
  return undefined;
}

function findRegionFilter(lower: string): string | undefined {
  for (const r of REGIONS) {
    if (lower.includes(r)) {
      return r
        .split(" ")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
    }
  }
  return undefined;
}

function findQuarterFilter(lower: string): string | undefined {
  const m = lower.match(/q([1-4])\s*(20\d{2})?/i) || lower.match(/(20\d{2})\s*q([1-4])/i);
  if (!m) return undefined;
  const nums = m.filter((x) => x && /^\d+$/.test(x));
  const year = nums.find((n) => n.length === 4);
  const q = nums.find((n) => n.length === 1);
  if (year && q) return `${year}-Q${q}`;
  return undefined;
}

const FOLLOW_UP_MARKERS = ["that", "this", "it", "instead", "now show", "and by"];

export interface ParseResult {
  ok: true;
  query: StructuredQuery;
  narration: string;
}
export interface ParseFailure {
  ok: false;
  reason: "no_metric" | "ungoverned_metric";
  attemptedMetric?: string;
}

export function parseMessage(message: string, context: ConversationContext = {}): ParseResult | ParseFailure {
  const lower = message.toLowerCase().trim();

  let metric = findMetric(lower);
  const isFollowUp = !metric && FOLLOW_UP_MARKERS.some((m) => lower.includes(m)) && !!context.lastMetric;
  if (!metric && isFollowUp) metric = context.lastMetric;

  if (!metric) {
    return { ok: false, reason: "no_metric" };
  }
  if (!GOVERNED_METRIC_KEYS.includes(metric)) {
    return { ok: false, reason: "ungoverned_metric", attemptedMetric: metric };
  }

  const groupBy = findGroupBy(lower) ?? (isFollowUp ? context.lastGroupBy : undefined);
  const region = findRegionFilter(lower);
  const quarter = findQuarterFilter(lower);

  const filters: StructuredQuery["filters"] = {
    ...(isFollowUp ? context.lastFilters : undefined),
    ...(region ? { region } : {}),
    ...(quarter ? { quarter } : {}),
  };

  const query: StructuredQuery = {
    metric,
    ...(groupBy ? { groupBy } : {}),
    ...(Object.keys(filters).length ? { filters } : {}),
  };

  const parts = [`metric=${metric}`];
  if (groupBy) parts.push(`groupBy=${groupBy}`);
  if (filters.region) parts.push(`region=${filters.region}`);
  if (filters.quarter) parts.push(`quarter=${filters.quarter}`);

  return { ok: true, query, narration: parts.join(", ") };
}
