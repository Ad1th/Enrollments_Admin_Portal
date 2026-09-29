import React, { useEffect, useState } from "react";
import { adminService } from "../api/services";
import { Card, Button } from "../components/ResultComponents";

const DOMAINS = ["tech", "design", "management"];
const DOMAIN_COLOUR = { tech: "var(--tech-color)", design: "var(--design-color)", management: "var(--management-color)" };
const input = {
  background: "var(--bg-dark)",
  color: "var(--text-main)",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: "8px 10px",
};

const Chip = ({ on, colour, children, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      cursor: "pointer",
      border: `1px solid ${on ? colour : "var(--border-color)"}`,
      background: on ? `color-mix(in srgb, ${colour} 20%, transparent)` : "transparent",
      color: on ? colour : "var(--text-light)",
    }}
  >
    {children}
  </button>
);

const Unavailability = ({ interviewer, onSave }) => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const blocks = interviewer.unavailable || [];
  const fmt = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ fontSize: 12 }}>
      {blocks.map((b, i) => (
        <div key={i} style={{ color: "var(--text-muted)", display: "flex", gap: 6, alignItems: "center" }}>
          {fmt(b.start)} → {fmt(b.end)}
          <button onClick={() => onSave(blocks.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={{ ...input, padding: 4, colorScheme: "dark" }} />
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} style={{ ...input, padding: 4, colorScheme: "dark" }} />
        <button
          disabled={!start || !end || end <= start}
          onClick={() => {
            onSave([...blocks, { start: new Date(start).toISOString(), end: new Date(end).toISOString() }]);
            setStart("");
            setEnd("");
          }}
          style={{ ...input, padding: "4px 8px", cursor: "pointer" }}
        >
          + busy
        </button>
      </div>
    </div>
  );
};

// Who can sit on panels, which domains/expertise they cover, how much they've
// already done. Auto-assignment reads straight from here.
const Interviewers = () => {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", domains: [] });
  const [bulk, setBulk] = useState("");
  const [message, setMessage] = useState("");

  const load = () => adminService.getInterviewers().then((r) => setList(r.data || []));
  useEffect(() => {
    load();
  }, []);

  const patch = async (i, fields) => {
    const res = await adminService.updateInterviewer(i._id, fields);
    setList((prev) => prev.map((x) => (x._id === i._id ? { ...x, ...res.data } : x)));
  };

  const add = async () => {
    try {
      await adminService.createInterviewer(form);
      setForm({ name: "", email: "", domains: [] });
      setMessage("");
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not add");
    }
  };

  const importBulk = async () => {
    const res = await adminService.importInterviewers(bulk);
    const { added, updated, skipped } = res.data;
    setMessage(`Added ${added}, updated ${updated}${skipped.length ? `, skipped ${skipped.length} unreadable line(s)` : ""}`);
    setBulk("");
    load();
  };

  const remove = async (i) => {
    if (!window.confirm(`Remove ${i.name}?`)) return;
    const res = await adminService.deleteInterviewer(i._id);
    setMessage(res.message || "Removed");
    load();
  };

  const active = list.filter((i) => i.active);
  const coverage = DOMAINS.map((d) => [d, active.filter((i) => i.domains.includes(d)).length]);

  return (
    <div className="container" style={{ maxWidth: 1300 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Interviewers</h1>
      <p style={{ color: "var(--text-light)", marginBottom: 16 }}>
        Each booking gets a panel automatically: one interviewer per domain being interviewed, least-loaded first,
        preferring matching expertise, skipping anyone busy in Google Calendar, marked unavailable, or over their
        daily cap.
      </p>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {coverage.map(([d, n]) => (
          <Card key={d} style={{ padding: "12px 20px" }}>
            <span style={{ color: DOMAIN_COLOUR[d], fontWeight: 700, fontSize: 22 }}>{n}</span>{" "}
            <span style={{ color: "var(--text-muted)" }}>active for {d}</span>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card>
          <h3 style={{ marginBottom: 12 }}>Add one</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <input style={input} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input style={{ ...input, flex: 1 }} placeholder="email@vitstudent.ac.in" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {DOMAINS.map((d) => (
              <Chip key={d} on={form.domains.includes(d)} colour={DOMAIN_COLOUR[d]} onClick={() => setForm({ ...form, domains: form.domains.includes(d) ? form.domains.filter((x) => x !== d) : [...form.domains, d] })}>
                {d}
              </Chip>
            ))}
          </div>
          <Button onClick={add} disabled={!form.name || !form.email}>Add interviewer</Button>
        </Card>
        <Card>
          <h3 style={{ marginBottom: 12 }}>Paste a list</h3>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"Name, email, domains, expertise\nAsha Rao, asha.rao2024@vitstudent.ac.in, tech, frontend ml\nDev K, dev.k2024@vitstudent.ac.in, design management"}
            style={{ ...input, width: "100%", minHeight: 90, fontFamily: "monospace", fontSize: 12 }}
          />
          <Button onClick={importBulk} disabled={!bulk.trim()} style={{ marginTop: 8 }}>Import</Button>
        </Card>
      </div>
      {message && <p style={{ color: "var(--primary)", marginBottom: 16 }}>{message}</p>}

      <Card style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-light)", borderBottom: "1px solid var(--border-color)" }}>
              {["Interviewer", "Domains", "Expertise", "Max/day", "Load", "Unavailable", ""].map((h) => (
                <th key={h} style={{ padding: 14, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i._id} style={{ borderBottom: "1px solid var(--border-color)", opacity: i.active ? 1 : 0.45 }}>
                <td style={{ padding: 14 }}>
                  <div style={{ color: "var(--text-main)" }}>{i.name}</div>
                  <div style={{ color: "var(--text-light)", fontSize: 12 }}>{i.email}</div>
                </td>
                <td style={{ padding: 14 }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {DOMAINS.map((d) => (
                      <Chip key={d} on={i.domains.includes(d)} colour={DOMAIN_COLOUR[d]} onClick={() => patch(i, { domains: i.domains.includes(d) ? i.domains.filter((x) => x !== d) : [...i.domains, d] })}>
                        {d}
                      </Chip>
                    ))}
                  </div>
                </td>
                <td style={{ padding: 14 }}>
                  <input
                    style={{ ...input, width: 150 }}
                    defaultValue={(i.subdomains || []).join(" ")}
                    placeholder="frontend ml"
                    onBlur={(e) => patch(i, { subdomains: e.target.value.split(/\s+/).filter(Boolean) })}
                  />
                </td>
                <td style={{ padding: 14 }}>
                  <input type="number" min="1" max="50" style={{ ...input, width: 64 }} defaultValue={i.maxPerDay} onBlur={(e) => patch(i, { maxPerDay: Number(e.target.value) })} />
                </td>
                <td style={{ padding: 14, color: "var(--text-muted)" }}>
                  {i.load.total} total · {i.load.upcoming} upcoming
                </td>
                <td style={{ padding: 14 }}>
                  <Unavailability interviewer={i} onSave={(blocks) => patch(i, { unavailable: blocks })} />
                </td>
                <td style={{ padding: 14, whiteSpace: "nowrap" }}>
                  <label style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 12 }}>
                    <input type="checkbox" checked={i.active} onChange={(e) => patch(i, { active: e.target.checked })} /> active
                  </label>
                  <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>Remove</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 24, color: "var(--text-light)" }}>
                  No interviewers yet. Until you add some, every booking invites the old hardcoded list.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default Interviewers;
