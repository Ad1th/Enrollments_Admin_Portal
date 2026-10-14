import React, { useCallback, useEffect, useState } from "react";
import { adminService } from "../api/services";
import { Card, Button, Input } from "../components/ResultComponents";

const KINDS = [
  ["", "Everything"],
  ["write", "Changes"],
  ["login", "Logins"],
  ["read", "Views"],
];

const statusColor = (s) => (s >= 500 ? "#ef4444" : s >= 400 ? "#f59e0b" : "#22c55e");

// Owner-only audit trail: who logged in, who changed what, and what was refused.
const Logs = () => {
  const [rows, setRows] = useState([]);
  const [next, setNext] = useState(null);
  const [kind, setKind] = useState("write");
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(
    async (before) => {
      setLoading(true);
      setError("");
      try {
        const res = await adminService.getLogs({ kind, actor, q, before, limit: 100 });
        setRows((prev) => (before ? [...prev, ...res.data] : res.data));
        setNext(res.nextBefore);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load logs");
      } finally {
        setLoading(false);
      }
    },
    [kind, actor, q]
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 style={{ marginBottom: 4 }}>Activity log</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>Only you can see this page.</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "16px 0" }}>
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, background: "var(--bg-card)", color: "var(--text-main)", border: "1px solid var(--border-color)" }}>
          {KINDS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <Input placeholder="Filter by admin email" value={actor} onChange={(e) => setActor(e.target.value)} style={{ maxWidth: 260 }} />
        <Input placeholder="Filter by route, e.g. /reviews" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
        <Button variant="secondary" onClick={() => load()}>Refresh</Button>
      </div>

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

      <Card style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-light)" }}>
              {["When", "Who", "Role", "Action", "Status", "IP"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-color)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <React.Fragment key={r._id}>
                <tr onClick={() => setOpen(open === r._id ? null : r._id)} style={{ cursor: r.body ? "pointer" : "default", borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "8px 14px", whiteSpace: "nowrap" }}>{new Date(r.at).toLocaleString()}</td>
                  <td style={{ padding: "8px 14px" }}>{r.actorEmail || "-"}</td>
                  <td style={{ padding: "8px 14px" }}>{r.role || "-"}</td>
                  <td style={{ padding: "8px 14px" }}>
                    {r.kind === "login" ? `${r.note || "login"}` : `${r.method} ${r.path}`}
                  </td>
                  <td style={{ padding: "8px 14px", color: statusColor(r.status), fontWeight: 600 }}>{r.status}</td>
                  <td style={{ padding: "8px 14px", color: "var(--text-light)" }}>{r.ip}</td>
                </tr>
                {open === r._id && r.body && (
                  <tr>
                    <td colSpan={6} style={{ padding: "8px 14px 14px", background: "rgba(255,255,255,0.02)" }}>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "var(--text-muted)" }}>{JSON.stringify(r.body, null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, color: "var(--text-light)" }}>Nothing logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {next && (
        <div style={{ marginTop: 16 }}>
          <Button variant="secondary" onClick={() => load(next)} disabled={loading}>{loading ? "Loading..." : "Load older"}</Button>
        </div>
      )}
    </div>
  );
};

export default Logs;
