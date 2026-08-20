"use client";

import { useState, useRef, useEffect } from "react";
import Chart, { ChartPayload } from "@/components/Chart";

type Msg = { role: "user" | "assistant"; content: string; chart?: ChartPayload | null };

const CHART_MARKER = "<!--CHART:";

function splitChart(raw: string): { text: string; chart: ChartPayload | null } {
  const idx = raw.indexOf(CHART_MARKER);
  if (idx === -1) return { text: raw, chart: null };
  const text = raw.slice(0, idx).trim();
  const jsonStr = raw.slice(idx + CHART_MARKER.length, raw.lastIndexOf("-->"));
  try {
    return { text, chart: JSON.parse(jsonStr) as ChartPayload };
  } catch {
    return { text, chart: null };
  }
}

const SESSION_ID = "demo-session"; // Week 4: replace with a real per-browser id (uuid in localStorage)

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, sessionId: SESSION_ID }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value);
        const { text } = splitChart(acc);
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: text };
          return copy;
        });
      }

      const { text, chart } = splitChart(acc);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: text, chart };
        return copy;
      });
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "Something went wrong. Try again." };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>MetricMind</h1>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
        Governed metrics: revenue, cost, margin, margin %. Try "margin by region" or "revenue in Q1 2026".
      </p>

      <div style={{ minHeight: 400, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.role === "user" ? "right" : "left", margin: "8px 0" }}>
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 8,
                background: m.role === "user" ? "#2563eb" : "#f1f5f9",
                color: m.role === "user" ? "#fff" : "#0f172a",
                maxWidth: "90%",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content || "…"}
            </span>
            {m.chart && <Chart payload={m.chart} />}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about revenue, cost, margin..."
          style={{ flex: 1, padding: 10, borderRadius: 6, border: "1px solid #cbd5e1" }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ padding: "10px 16px", borderRadius: 6, background: "#2563eb", color: "#fff", border: "none" }}
        >
          Send
        </button>
      </div>
    </main>
  );
}
