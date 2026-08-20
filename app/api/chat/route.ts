// Week 2: replaced the canned stub with the real orchestrator —
// parseMessage() -> runQuery() against the governed semantic layer.
// Week 3: added conversation memory (per-session, in-process) so
// follow-ups like "now break that down by region" work, plus a
// machine-readable data block appended after the prose answer so the
// UI can render a chart without a second round-trip.

import { parseMessage } from "@/lib/nlu";
import type { ConversationContext } from "@/lib/nlu";
import { runQuery } from "@/lib/queryEngine";
import { formatValue, METRICS } from "@/lib/semanticLayer";
import { noMetricMessage, ungovernedMetricMessage } from "@/lib/guardrails";

// In-memory session store. Fine for local dev / a single review demo;
// swap for Redis (or a signed cookie holding the last query) before any
// real deployment — see README "Week 4: known limitations".
const sessions = new Map<string, ConversationContext>();

function narrateResult(result: ReturnType<typeof runQuery>): string {
  const def = METRICS[result.metric];
  if (result.rows.length === 1 && result.rows[0].group === null) {
    return `${def.label} is ${formatValue(result.rows[0].value, def.format)}.`;
  }
  const lines = result.rows.map((r) => `- ${r.group}: ${formatValue(r.value, def.format)}`).join("\n");
  return `${def.label} by group:\n${lines}\n\nTotal: ${formatValue(result.total, def.format)}.`;
}

export async function POST(req: Request) {
  const { message, sessionId = "default" } = await req.json();

  if (!message || !message.trim()) {
    return textResponse("Ask me about revenue, cost, margin, or margin % — optionally by region or quarter.");
  }

  const context = sessions.get(sessionId) ?? {};
  const parsed = parseMessage(message, context);

  if (!parsed.ok) {
    const msg = parsed.reason === "no_metric" ? noMetricMessage() : ungovernedMetricMessage(parsed.attemptedMetric);
    return textResponse(msg);
  }

  let result;
  try {
    result = runQuery(parsed.query);
  } catch (err) {
    return textResponse('Something went wrong running that query. Try rephrasing — e.g. "margin by region".', 500);
  }

  sessions.set(sessionId, {
    lastMetric: parsed.query.metric,
    lastGroupBy: parsed.query.groupBy,
    lastFilters: parsed.query.filters,
  });

  const prose = narrateResult(result);
  const chartPayload =
    result.rows.length > 1
      ? { metric: result.metric, label: result.label, data: result.rows.map((r) => ({ name: r.group, value: r.value })) }
      : null;

  return textResponse(prose, 200, chartPayload);
}

function textResponse(text: string, status = 200, chart: unknown = null) {
  const words = text.split(" ");
  const stream = new ReadableStream({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(new TextEncoder().encode(word + " "));
        await new Promise((r) => setTimeout(r, 25));
      }
      if (chart) {
        controller.enqueue(new TextEncoder().encode(`\n\n<!--CHART:${JSON.stringify(chart)}-->`));
      }
      controller.close();
    },
  });

  return new Response(stream, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
