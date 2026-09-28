import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { adminService } from "../api/services";
import { Card } from "../components/ResultComponents";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STAGES = [
  ["applied", "Applied"],
  ["submitted", "Submitted task"],
  ["shortlisted", "Shortlisted"],
  ["selected", "Selected"],
  ["accepted", "Accepted offer"],
];
const TITLE = { tech: "Tech", design: "Design", management: "Management" };
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "–");

const Tile = ({ label, value, sub }) => (
  <Card style={{ padding: "16px 20px", flex: 1, minWidth: 160 }}>
    <div style={{ fontSize: 12, color: "var(--text-light)", textTransform: "uppercase" }}>{label}</div>
    <div style={{ fontSize: 30, fontWeight: 700, color: "var(--text-main)" }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: "var(--text-light)" }}>{sub}</div>}
  </Card>
);

// Single-series horizontal bar with the value written next to it (no legend
// needed; the row label names it). Hover shows the exact figure.
const Bar = ({ label, value, max, note }) => (
  <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 90px", gap: 12, alignItems: "center", margin: "6px 0" }} title={`${label}: ${value}${note ? ` (${note})` : ""}`}>
    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{label}</span>
    <div style={{ height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>
      <div style={{ width: `${max ? (value / max) * 100 : 0}%`, height: "100%", background: "var(--primary)", borderRadius: "0 4px 4px 0", minWidth: value ? 2 : 0 }} />
    </div>
    <span style={{ fontSize: 13, color: "var(--text-main)" }}>
      {value} {note && <span style={{ color: "var(--text-light)" }}>{note}</span>}
    </span>
  </div>
);

// Sequential: one hue, low = near-surface, high = full brand orange.
const heat = (n, max) => (n ? `rgba(252,122,0,${0.15 + 0.85 * (n / max)})` : "rgba(255,255,255,0.03)");

const Heatmap = ({ cells }) => {
  const grid = new Map(cells.map((c) => [`${c.day}-${c.hour}`, c.n]));
  const max = Math.max(1, ...cells.map((c) => c.n));
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 2, fontSize: 11 }}>
        <thead>
          <tr>
            <th />
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} style={{ color: "var(--text-light)", fontWeight: 400, width: 22 }}>{h % 3 === 0 ? h : ""}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d, i) => (
            <tr key={d}>
              <td style={{ color: "var(--text-light)", paddingRight: 6 }}>{d}</td>
              {Array.from({ length: 24 }, (_, h) => {
                const n = grid.get(`${i + 1}-${h}`) || 0;
                return <td key={h} title={`${d} ${h}:00–${h + 1}:00 IST: ${n} submission${n === 1 ? "" : "s"}`} style={{ width: 22, height: 22, borderRadius: 4, background: heat(n, max) }} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 6 }}>Darker = more submissions (max {max} in one hour). Times in IST.</div>
    </div>
  );
};

// Recruitment analytics for admins: the funnel per domain, what people apply
// for, when they submit, how interviews and offers went.
const Stats = () => {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminService
      .getStats()
      .then((r) => setS(r.data))
      .catch(() => setError("Could not load stats"));
  }, []);

  if (error) return <p style={{ color: "#ef4444" }}>{error}</p>;
  if (!s) return <p style={{ color: "var(--text-light)" }}>Crunching numbers...</p>;

  const t = s.totals;
  const selected = s.funnel.reduce((a, f) => a + f.selected, 0);
  const accepted = s.funnel.reduce((a, f) => a + f.accepted, 0);
  const maxLoad = Math.max(1, ...s.interviewerLoad.map((l) => l.n));

  return (
    <div className="container" style={{ maxWidth: 1300 }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Stats</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <Tile label="Registered" value={t.registered} sub={`${t.verified} verified · ${t.profileDone} finished profile`} />
        <Tile label="First years" value={t.juniors} sub={`${t.seniors} seniors`} />
        <Tile label="Selected" value={selected} sub="across all domains" />
        <Tile label="Offers accepted" value={accepted} sub={pct(accepted, selected) + " of selections"} />
        <Tile label="Interviews" value={Object.values(s.meetings).reduce((a, b) => a + b, 0)} sub={`${s.meetings.completed || 0} completed · ${s.meetings["no-show"] || 0} no-shows`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16, marginBottom: 24 }}>
        {s.funnel.map((f) => (
          <Card key={f.domain}>
            <h3 style={{ marginBottom: 8 }}>{TITLE[f.domain]} funnel</h3>
            {STAGES.map(([key, label], i) => (
              <Bar key={key} label={label} value={f[key]} max={f.applied} note={i > 0 ? pct(f[key], f[STAGES[i - 1][0]]) : null} />
            ))}
            <div style={{ fontSize: 12, color: "var(--text-light)", marginTop: 6 }}>
              {f.rejected} rejected · % is conversion from the previous step
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card>
          <h3 style={{ marginBottom: 12 }}>Sign-ups per day</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={s.signups} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#a0a0a0", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fill: "#a0a0a0", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ stroke: "#a0a0a0", strokeDasharray: "3 3" }}
                  contentStyle={{ background: "#2c2c2c", border: "1px solid #404040", borderRadius: 8, color: "#fff" }}
                  formatter={(v) => [v, "sign-ups"]}
                />
                <Area type="monotone" dataKey="n" stroke="#fc7a00" strokeWidth={2} fill="rgba(252,122,0,0.15)" activeDot={{ r: 5, stroke: "#2c2c2c", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 style={{ marginBottom: 12 }}>AI score vs decision</h3>
          {s.aiVsOutcome.length === 0 ? (
            <p style={{ color: "var(--text-light)", fontSize: 13 }}>No AI reviews yet.</p>
          ) : (
            <>
              {["selected", "pending", "rejected"].map((o) => {
                const row = s.aiVsOutcome.find((a) => a.outcome === o);
                return row ? <Bar key={o} label={o[0].toUpperCase() + o.slice(1)} value={row.avg} max={10} note={`/10 · n=${row.n}`} /> : null;
              })}
              <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 8 }}>
                If selected and rejected candidates average about the same, the rubrics need work.
              </p>
            </>
          )}
        </Card>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>When people submit</h3>
        <Heatmap cells={s.heatmap} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ marginBottom: 12 }}>Subdomains: applicants and selection rate</h3>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--text-light)", textAlign: "left" }}>
                <th style={{ padding: 6 }}>Domain</th>
                <th style={{ padding: 6 }}>Subdomain</th>
                <th style={{ padding: 6 }}>Submitted</th>
                <th style={{ padding: 6 }}>Selected</th>
                <th style={{ padding: 6 }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {s.subdomains.map((r) => (
                <tr key={`${r.domain}-${r.subdomain}`} style={{ borderTop: "1px solid var(--border-color)" }}>
                  <td style={{ padding: 6, color: "var(--text-light)" }}>{TITLE[r.domain]}</td>
                  <td style={{ padding: 6 }}>{r.subdomain}</td>
                  <td style={{ padding: 6 }}>{r.applicants}</td>
                  <td style={{ padding: 6 }}>{r.selected}</td>
                  <td style={{ padding: 6 }}>{pct(r.selected, r.applicants)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <h3 style={{ marginBottom: 12 }}>Interviewer load</h3>
          {s.interviewerLoad.length === 0 && <p style={{ color: "var(--text-light)", fontSize: 13 }}>No panels assigned yet.</p>}
          {s.interviewerLoad.slice(0, 20).map((l) => (
            <Bar key={l.email} label={l.email.split("@")[0]} value={l.n} max={maxLoad} />
          ))}
        </Card>
      </div>
    </div>
  );
};

export default Stats;
