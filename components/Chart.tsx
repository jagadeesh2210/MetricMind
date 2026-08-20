"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export interface ChartPayload {
  metric: string;
  label: string;
  data: { name: string; value: number }[];
}

export default function Chart({ payload }: { payload: ChartPayload }) {
  return (
    <div style={{ width: "100%", height: 220, marginTop: 8 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{payload.label} by group</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={payload.data}>
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
