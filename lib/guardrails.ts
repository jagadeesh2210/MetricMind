// Week 3: guardrails. MetricMind only ever answers with numbers that
// trace back to a governed metric definition in semanticLayer.ts — it
// will not estimate, guess, or compute an ungoverned number even if the
// raw columns to do so are technically present in the data.

import { GOVERNED_METRIC_KEYS, METRICS } from "./semanticLayer";

export function governedMetricList(): string {
  return GOVERNED_METRIC_KEYS.map((k) => METRICS[k].label).join(", ");
}

export function noMetricMessage(): string {
  return `I can only answer using governed metrics: ${governedMetricList()}. Try asking about one of those, optionally "by region" or "by quarter".`;
}

export function ungovernedMetricMessage(attempted?: string): string {
  const suffix = attempted ? ` "${attempted}" isn't a governed metric.` : "";
  return `${suffix} I can only answer using governed metrics: ${governedMetricList()}.`.trim();
}
