import React, { useEffect, useState } from "react";
import { adminService } from "../api/services";
import { Card, Button } from "../components/ResultComponents";

const field = {
  background: "var(--bg-dark)",
  color: "var(--text-main)",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: "8px 10px",
  width: "100%",
};
const ROUNDS = [
  [-1, "Rejected"],
  [0, "Under review"],
  [1, "Interview round"],
  [2, "Selected"],
  [3, "Core"],
];
const PLACEHOLDERS = ["{{firstName}}", "{{name}}", "{{regno}}", "{{domains}}", "{{portalUrl}}"];

// Sends campaigns batch by batch from the browser so no single request runs
// long enough to hit the serverless timeout. Closing the tab just pauses it.
const useSender = (onProgress) => {
  const [sending, setSending] = useState(null);
  const send = async (campaignId) => {
    setSending(campaignId);
    try {
      for (;;) {
        const res = await adminService.sendCampaignBatch(campaignId);
        onProgress(campaignId, res.data);
        if (res.data.remaining === 0 || res.data.processed === 0) break;
      }
    } finally {
      setSending(null);
    }
  };
  return { sending, send };
};

const Comms = () => {
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [filter, setFilter] = useState({ domain: "", rounds: [], submitted: "", meeting: "", offer: "" });
  const [audience, setAudience] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({});

  const loadCampaigns = () => adminService.getCampaigns().then((r) => setCampaigns(r.data || []));
  useEffect(() => {
    adminService.getTemplates().then((r) => setTemplates(r.data || []));
    loadCampaigns();
  }, []);

  const cleanFilter = () => ({
    ...(filter.domain ? { domain: filter.domain } : {}),
    ...(filter.domain && filter.rounds.length ? { rounds: filter.rounds } : {}),
    ...(filter.submitted !== "" ? { submitted: filter.submitted === "yes" } : {}),
    ...(filter.meeting ? { meeting: filter.meeting } : {}),
    ...(filter.offer ? { offer: filter.offer } : {}),
  });

  // Live recipient count and a rendered preview for the first recipient.
  useEffect(() => {
    const t = setTimeout(() => {
      adminService
        .previewAudience(cleanFilter(), subject, body)
        .then((r) => setAudience(r.data))
        .catch(() => setAudience(null));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, subject, body]);

  const { sending, send } = useSender((id, p) => {
    setProgress((prev) => ({ ...prev, [id]: p }));
    if (p.remaining === 0) loadCampaigns();
  });

  const launch = async () => {
    if (!window.confirm(`Send "${subject}" to ${audience?.count} people?`)) return;
    setError("");
    try {
      const res = await adminService.createCampaign({ name, subject, body, filter: cleanFilter() });
      await loadCampaigns();
      await send(res.data._id);
      loadCampaigns();
    } catch (err) {
      setError(err.response?.data?.message || "Could not send");
    }
  };

  const saveTemplate = async () => {
    const tplName = window.prompt("Template name", name || subject);
    if (!tplName) return;
    const res = await adminService.saveTemplate({ name: tplName, subject, body });
    setTemplates((prev) => [res.data, ...prev.filter((t) => t._id !== res.data._id)]);
  };

  const toggleRound = (r) =>
    setFilter((f) => ({ ...f, rounds: f.rounds.includes(r) ? f.rounds.filter((x) => x !== r) : [...f.rounds, r] }));

  return (
    <div className="container" style={{ maxWidth: 1300 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Comms</h1>
      <p style={{ color: "var(--text-light)", marginBottom: 24 }}>
        Mail any slice of applicants from a template. Sent from the club Gmail (about 500 mails a day on a personal
        account, 2,000 on Workspace). Opens are tracked with a pixel, so treat them as approximate.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginBottom: 32 }}>
        <Card>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <select
              style={{ ...field, width: "auto" }}
              value=""
              onChange={(e) => {
                const t = templates.find((x) => x._id === e.target.value);
                if (t) {
                  setSubject(t.subject);
                  setBody(t.body);
                  setName(t.name);
                }
              }}
            >
              <option value="">Load template...</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
            <input style={field} placeholder="Campaign name (internal)" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <input style={{ ...field, marginBottom: 8 }} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea
            style={{ ...field, minHeight: 220, fontFamily: "inherit" }}
            placeholder={"Hi {{firstName}},\n\nYou've been shortlisted for the interview round! Book your slot: {{portalUrl}}/meeting\n\nTeam MFC"}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0 12px" }}>
            {PLACEHOLDERS.map((p) => (
              <button key={p} onClick={() => setBody((b) => `${b}${p}`)} style={{ ...field, width: "auto", padding: "2px 8px", fontSize: 12, cursor: "pointer" }}>
                {p}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={launch} disabled={!subject || !body || !audience?.count || Boolean(sending) || !audience?.mailConfigured}>
              {sending ? "Sending..." : `Send to ${audience?.count ?? 0}`}
            </Button>
            <Button variant="outline" onClick={saveTemplate} disabled={!subject || !body}>Save as template</Button>
          </div>
          {audience && !audience.mailConfigured && (
            <p style={{ color: "#f59e42", marginTop: 8, fontSize: 13 }}>Set MFC_EMAIL and MFC_EMAIL_PASSWORD on the admin backend to send.</p>
          )}
          {error && <p style={{ color: "#ef4444", marginTop: 8 }}>{error}</p>}
        </Card>

        <Card>
          <h3 style={{ marginBottom: 12 }}>Audience</h3>
          <label style={{ fontSize: 13, color: "var(--text-muted)" }}>Domain</label>
          <select style={{ ...field, marginBottom: 12 }} value={filter.domain} onChange={(e) => setFilter({ ...filter, domain: e.target.value, rounds: [] })}>
            <option value="">Everyone</option>
            <option value="tech">Tech</option>
            <option value="design">Design</option>
            <option value="management">Management</option>
          </select>
          {filter.domain && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, fontSize: 13 }}>
              {ROUNDS.map(([r, label]) => (
                <label key={r} style={{ color: "var(--text-muted)" }}>
                  <input type="checkbox" checked={filter.rounds.includes(r)} onChange={() => toggleRound(r)} /> {label}
                </label>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            <select style={field} value={filter.submitted} onChange={(e) => setFilter({ ...filter, submitted: e.target.value })}>
              <option value="">Task: any</option>
              <option value="yes">Submitted</option>
              <option value="no">Not submitted</option>
            </select>
            <select style={field} value={filter.meeting} onChange={(e) => setFilter({ ...filter, meeting: e.target.value })}>
              <option value="">Interview: any</option>
              <option value="booked">Booked</option>
              <option value="none">Not booked</option>
            </select>
            <select style={field} value={filter.offer} onChange={(e) => setFilter({ ...filter, offer: e.target.value })}>
              <option value="">Offer: any</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)" }}>{audience?.count ?? "–"}</div>
          <div style={{ color: "var(--text-light)", fontSize: 13, marginBottom: 12 }}>
            recipients{audience?.sample?.length ? `, e.g. ${audience.sample.map((u) => u.username).join(", ")}` : ""}
          </div>
          {audience?.preview && (
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text-light)" }}>Preview for {audience.sample[0].username}</div>
              <div style={{ fontWeight: 600, margin: "6px 0" }}>{audience.preview.subject}</div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--text-muted)" }}>{audience.preview.text}</div>
            </div>
          )}
        </Card>
      </div>

      <h2 style={{ fontSize: 20, marginBottom: 12 }}>Campaigns</h2>
      <Card style={{ padding: 0 }}>
        {campaigns.length === 0 && <p style={{ padding: 16, color: "var(--text-light)" }}>Nothing sent yet.</p>}
        {campaigns.map((c) => {
          const live = progress[c._id];
          const sent = live?.sent ?? c.stats.sent;
          const failed = live?.failed ?? c.stats.failed;
          const queued = live?.remaining ?? c.stats.queued;
          const done = sent + failed;
          return (
            <div key={c._id} style={{ padding: 16, borderBottom: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-light)" }}>
                    {new Date(c.createdAt).toLocaleString()} · by {c.createdBy} · “{c.subject}”
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 13 }}>
                  <span><strong style={{ color: "#22c55e" }}>{sent}</strong> sent</span>
                  <span><strong style={{ color: "var(--primary)" }}>{c.stats.opened}</strong> opened ({sent ? Math.round((c.stats.opened / sent) * 100) : 0}%)</span>
                  {failed > 0 && <span><strong style={{ color: "#ef4444" }}>{failed}</strong> failed</span>}
                  {queued > 0 && sending !== c._id && <Button variant="outline" onClick={() => send(c._id)}>Resume ({queued})</Button>}
                  {failed > 0 && queued === 0 && sending !== c._id && (
                    <Button variant="outline" onClick={async () => { await adminService.retryCampaign(c._id); await loadCampaigns(); send(c._id); }}>
                      Retry failed
                    </Button>
                  )}
                </div>
              </div>
              <div style={{ height: 6, background: "var(--bg-dark)", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${c.total ? (done / c.total) * 100 : 0}%`, background: failed ? "#f59e42" : "#22c55e", transition: "width .3s" }} />
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

export default Comms;
