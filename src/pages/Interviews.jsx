import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../api/services";
import { Card, Button } from "../components/ResultComponents";

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
const input = {
  background: "var(--bg-dark)",
  color: "var(--text-main)",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: "8px 10px",
  width: "100%",
};

const DOMAINS = ["tech", "design", "management"];
const DOMAIN_COLOUR = { tech: "var(--tech-color)", design: "var(--design-color)", management: "var(--management-color)" };

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

// Modal for managing available interview dates and generating slots
const ManageSlotsModal = ({ isOpen, onClose, slots, onRefresh }) => {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selectedDomains, setSelectedDomains] = useState(["tech", "design", "management"]);
  const [maxCapacity, setMaxCapacity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterDate, setFilterDate] = useState("");

  if (!isOpen) return null;

  const toggleDomain = (d) => {
    setSelectedDomains((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const handleCreate = async () => {
    if (!date || !startTime || !endTime) {
      setError("Date, start time, and end time are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await adminService.createInterviewSlots({
        date,
        startTime,
        endTime,
        durationMinutes: Number(durationMinutes),
        domains: selectedDomains,
        maxCapacity: Number(maxCapacity),
      });
      setDate("");
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create interview slots");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this interview slot?")) return;
    try {
      await adminService.deleteInterviewSlot(id);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete slot");
    }
  };

  const displayedSlots = filterDate ? slots.filter((s) => s.date === filterDate) : slots;
  const uniqueDates = [...new Set(slots.map((s) => s.date))].sort();

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border-color)", maxWidth: 850, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 20, margin: 0 }}>Manage Interview Dates & Slots</h2>
            <p style={{ color: "var(--text-light)", fontSize: 13, margin: "4px 0 0" }}>Configure interview dates and auto-generate time slots for candidate booking.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Create new dates & slots form */}
          <Card style={{ padding: 18, border: "1px solid var(--border-color)" }}>
            <h3 style={{ fontSize: 16, marginBottom: 14, color: "var(--primary)" }}>Add Interview Date & Generate Slots</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Date</label>
                <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Start Time</label>
                <input type="time" style={input} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>End Time</label>
                <input type="time" style={input} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Slot Duration (Mins)</label>
                <select style={input} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)}>
                  <option value={15}>15 mins</option>
                  <option value={20}>20 mins</option>
                  <option value={30}>30 mins</option>
                  <option value={45}>45 mins</option>
                  <option value={60}>60 mins</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Capacity / Slot</label>
                <input type="number" min={1} max={10} style={input} value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Allowed Domains</label>
              <div style={{ display: "flex", gap: 8 }}>
                {DOMAINS.map((d) => {
                  const on = selectedDomains.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDomain(d)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 999,
                        fontSize: 12,
                        cursor: "pointer",
                        border: `1px solid ${on ? DOMAIN_COLOUR[d] : "var(--border-color)"}`,
                        background: on ? `color-mix(in srgb, ${DOMAIN_COLOUR[d]} 20%, transparent)` : "transparent",
                        color: on ? DOMAIN_COLOUR[d] : "var(--text-light)",
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <Button onClick={handleCreate} disabled={loading || !date}>
              {loading ? "Generating..." : "+ Generate Slots for Date"}
            </Button>
          </Card>

          {/* Configured slots list */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ fontSize: 16, margin: 0 }}>Existing Slots ({displayedSlots.length})</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Filter Date:</span>
                <select style={{ ...input, width: "auto", padding: "4px 8px", fontSize: 12 }} value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
                  <option value="">All Dates ({uniqueDates.length})</option>
                  {uniqueDates.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, maxHeight: 320, overflowY: "auto" }}>
              {displayedSlots.map((s) => (
                <div key={s._id} style={{ padding: 10, borderRadius: 8, background: "var(--bg-dark)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.date} · {timeOf(s.startTime)} - {timeOf(s.endTime)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-light)", marginTop: 2 }}>
                      Booked: {s.bookedCount}/{s.maxCapacity} · {(s.domains || []).join(", ")}
                    </div>
                  </div>
                  {s.bookedCount === 0 && (
                    <button onClick={() => handleDelete(s._id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>✕</button>
                  )}
                </div>
              ))}
              {displayedSlots.length === 0 && (
                <p style={{ color: "var(--text-light)", fontSize: 13 }}>No interview dates/slots configured yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal for directly scheduling an interview for a candidate
const ScheduleInterviewModal = ({ isOpen, onClose, interviewers, onScheduled }) => {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("11:00");
  const [endTime, setEndTime] = useState("11:30");
  const [domain, setDomain] = useState("tech");
  const [pickedInterviewers, setPickedInterviewers] = useState([]);
  const [gmeetLink, setGmeetLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      const adminId = localStorage.getItem("adminId");
      adminService.getAllUsers(adminId, 1, 1000).then((r) => setCandidates(r.data || [])).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCandidates = search.trim()
    ? candidates.filter((c) =>
        (c.username || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.regno || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.email || "").toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSchedule = async () => {
    if (!selectedUser || !date || !startTime || !endTime) {
      setError("Please select a candidate, date, and time");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const scheduledTime = new Date(`${date}T${startTime}:00`).toISOString();
      const endTimestamp = new Date(`${date}T${endTime}:00`).toISOString();

      await adminService.scheduleInterview({
        user_id: selectedUser._id,
        scheduledTime,
        endTime: endTimestamp,
        domains: [domain],
        intervieweremail: pickedInterviewers,
        gmeetLink: gmeetLink.trim() || undefined,
      });

      onScheduled();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not schedule interview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ backgroundColor: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border-color)", maxWidth: 600, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 20, margin: 0 }}>Schedule Candidate Interview</h2>
            <p style={{ color: "var(--text-light)", fontSize: 13, margin: "4px 0 0" }}>Assign a specific interview date and time slot to an applicant.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Candidate selector */}
          <div>
            <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Search & Select Candidate</label>
            {selectedUser ? (
              <div style={{ padding: 10, borderRadius: 8, background: "var(--bg-dark)", border: "1px solid var(--primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{selectedUser.username} ({selectedUser.regno})</div>
                  <div style={{ fontSize: 12, color: "var(--text-light)" }}>{selectedUser.email} · {(selectedUser.domain || []).join(", ")}</div>
                </div>
                <button onClick={() => setSelectedUser(null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>Change</button>
              </div>
            ) : (
              <div>
                <input
                  style={input}
                  placeholder="Type name, registration number, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {filteredCandidates.length > 0 && (
                  <div style={{ marginTop: 6, maxHeight: 150, overflowY: "auto", background: "var(--bg-dark)", border: "1px solid var(--border-color)", borderRadius: 8 }}>
                    {filteredCandidates.map((c) => (
                      <div
                        key={c._id}
                        onClick={() => {
                          setSelectedUser(c);
                          setSearch("");
                          if (c.domain && c.domain.length) setDomain(c.domain[0]);
                        }}
                        style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-color)", cursor: "pointer" }}
                      >
                        <span style={{ fontWeight: 600 }}>{c.username}</span> <span style={{ color: "var(--text-light)", fontSize: 12 }}>({c.regno})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Interview Date</label>
              <input type="date" style={input} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Start Time</label>
              <input type="time" style={input} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>End Time</label>
              <input type="time" style={input} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Domain</label>
            <select style={input} value={domain} onChange={(e) => setDomain(e.target.value)}>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Google Meet Link (Optional)</label>
            <input style={input} placeholder="https://meet.google.com/..." value={gmeetLink} onChange={(e) => setGmeetLink(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Assign Interviewers</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 100, overflowY: "auto" }}>
              {interviewers.filter((i) => i.active).map((i) => (
                <label key={i.email} style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  <input
                    type="checkbox"
                    checked={pickedInterviewers.includes(i.email)}
                    onChange={(e) => setPickedInterviewers(e.target.checked ? [...pickedInterviewers, i.email] : pickedInterviewers.filter((x) => x !== i.email))}
                  />{" "}
                  {i.name}
                </label>
              ))}
            </div>
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 10 }}>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={loading || !selectedUser || !date}>
              {loading ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// The interview board: every booking by day with its panel, status and link.
const Interviews = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [slots, setSlots] = useState([]);
  const [showPast, setShowPast] = useState(false);
  const [notice, setNotice] = useState("");
  const [showSlotsModal, setShowSlotsModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const loadData = () => {
    adminService.getMeetings().then((r) => setMeetings(r.data || [])).catch(() => {});
    adminService.getInterviewers().then((r) => setInterviewers(r.data || [])).catch(() => {});
    adminService.getInterviewSlots().then((r) => setSlots(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    loadData();
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Interviews</h1>
          <p style={{ color: "var(--text-light)", margin: 0, fontSize: 14 }}>
            Monitor scheduled candidate interviews, manage interview dates & time slots, and assign panels.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="outline" onClick={() => setShowSlotsModal(true)}>
            📅 Manage Dates & Slots
          </Button>
          <Button onClick={() => setShowScheduleModal(true)}>
            + Schedule Candidate
          </Button>
        </div>
      </div>
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

      <ManageSlotsModal
        isOpen={showSlotsModal}
        onClose={() => setShowSlotsModal(false)}
        slots={slots}
        onRefresh={loadData}
      />

      <ScheduleInterviewModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        interviewers={interviewers}
        onScheduled={loadData}
      />
    </div>
  );
};

export default Interviews;

