import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../api/services";
import { Card } from "../components/ResultComponents";

const STATUS_COLOUR = {
  scheduled: "var(--text-muted)",
  underway: "var(--primary)",
  completed: "#22c55e",
  cancelled: "var(--text-light)",
  "no-show": "#ef4444",
};
const select = {
  background: "var(--bg-dark)",
  color: "var(--text-main)",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: "6px 8px",
};

const dayKey = (d) => new Date(d).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" });
const timeOf = (d) => new Date(d).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });

const PanelEditor = ({ meeting, interviewers, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState(meeting.intervieweremail || []);
  const [error, setError] = useState("");
  const name = (email) => interviewers.find((i) => i.email === email)?.name || email.split("@")[0];

  if (!editing) {
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {(meeting.intervieweremail || []).map((e) => (
          <span key={e} className="badge">{name(e)}</span>
        ))}
        {meeting.panelIncomplete && <span className="badge warning">panel incomplete</span>}
        <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 12 }}>
          edit
        </button>
      </div>
    );
  }
  const relevant = interviewers.filter((i) => i.active && (i.domains.some((d) => (meeting.domains || []).includes(d)) || picked.includes(i.email)));
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 420 }}>
        {relevant.map((i) => (
          <label key={i.email} style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <input
              type="checkbox"
              checked={picked.includes(i.email)}
              onChange={(e) => setPicked(e.target.checked ? [...picked, i.email] : picked.filter((x) => x !== i.email))}
            />{" "}
            {i.name}
          </label>
        ))}
      </div>
      {error && <div style={{ color: "#ef4444", fontSize: 12 }}>{error}</div>}
      <button
        onClick={async () => {
          try {
            await onSave(picked);
            setEditing(false);
            setError("");
          } catch (err) {
            setError(err.response?.data?.message || "Could not update panel");
          }
        }}
        style={{ ...select, cursor: "pointer", marginTop: 6 }}
      >
        Save panel
      </button>{" "}
      <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", color: "var(--text-light)", cursor: "pointer" }}>
        cancel
      </button>
    </div>
  );
};

// The interview board: every booking by day with its panel, status and link.
const Interviews = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [showPast, setShowPast] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    adminService.getMeetings().then((r) => setMeetings(r.data || []));
    adminService.getInterviewers().then((r) => setInterviewers(r.data || []));
  }, []);

  const update = async (m, fields) => {
    const res = await adminService.updateMeeting(m._id, fields);
    setMeetings((prev) => prev.map((x) => (x._id === m._id ? { ...x, ...res.data } : x)));
    if (res.calendar && !res.calendar.ok) setNotice(`Saved, but the Calendar invite wasn't updated: ${res.calendar.reason}`);
  };

  const byDay = useMemo(() => {
    const now = Date.now() - 30 * 60e3;
    const groups = new Map();
    for (const m of meetings) {
      if (!showPast && new Date(m.endTime).getTime() < now) continue;
      const k = dayKey(m.scheduledTime);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(m);
    }
    return [...groups.entries()];
  }, [meetings, showPast]);

  const counts = meetings.reduce((acc, m) => ({ ...acc, [m.status]: (acc[m.status] || 0) + 1 }), {});

  return (
    <div className="container" style={{ maxWidth: 1300 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Interviews</h1>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24, flexWrap: "wrap", color: "var(--text-muted)" }}>
        {Object.entries(counts).map(([s, n]) => (
          <span key={s}>
            <strong style={{ color: STATUS_COLOUR[s] }}>{n}</strong> {s}
          </span>
        ))}
        <label style={{ marginLeft: "auto" }}>
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> show past
        </label>
      </div>
      {notice && <p style={{ color: "#f59e42", marginBottom: 16 }}>{notice}</p>}
      {byDay.length === 0 && <p style={{ color: "var(--text-light)" }}>No upcoming interviews.</p>}
      {byDay.map(([day, list]) => (
        <div key={day} style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8, color: "var(--primary)" }}>{day}</h3>
          <Card style={{ padding: 0 }}>
            {list.map((m) => (
              <div key={m._id} style={{ display: "grid", gridTemplateColumns: "90px 1.2fr 2fr 140px 90px", gap: 16, padding: 14, borderBottom: "1px solid var(--border-color)", alignItems: "center" }}>
                <div style={{ fontWeight: 600 }}>{timeOf(m.scheduledTime)}</div>
                <div>
                  <button onClick={() => navigate(`/participants?open=${m.user_id}`)} style={{ background: "none", border: "none", color: "var(--text-main)", cursor: "pointer", padding: 0, textAlign: "left" }}>
                    {m.candidate?.username || "Unknown"}
                  </button>
                  <div style={{ fontSize: 12, color: "var(--text-light)" }}>
                    {m.candidate?.regno} · {(m.domains || []).join(", ")}
                    {m.rescheduleCount ? ` · moved ${m.rescheduleCount}×` : ""}
                  </div>
                </div>
                <PanelEditor meeting={m} interviewers={interviewers} onSave={(panel) => update(m, { panel })} />
                <select value={m.status} onChange={(e) => update(m, { status: e.target.value })} style={{ ...select, color: STATUS_COLOUR[m.status] }}>
                  {Object.keys(STATUS_COLOUR).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {m.gmeetLink ? (
                  <a href={m.gmeetLink} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>Join</a>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
};

export default Interviews;
