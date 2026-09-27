import React from "react";

export const roundLabel = (level) =>
  level === -1 ? "Rejected" : level === 3 ? "Core" : `Round ${level}`;

const colour = (to, from) => (to === -1 ? "#ef4444" : to > from ? "#22c55e" : "#f59e42");

// Newest first: "Round 0 → Round 1 · tech · by someone@vit · 2h ago".
const StatusHistory = ({ events = [], domain }) => {
  const shown = domain ? events.filter((e) => e.domain === domain) : events;
  if (shown.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No round changes yet.</p>;
  }
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {shown.map((e) => (
        <li
          key={e._id}
          style={{
            display: "flex",
            gap: 12,
            padding: "8px 0",
            borderBottom: "1px solid var(--border-color)",
            fontSize: 13,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              marginTop: 6,
              borderRadius: "50%",
              flexShrink: 0,
              background: colour(e.to, e.from),
            }}
          />
          <div>
            <div style={{ color: "var(--text-main)" }}>
              {roundLabel(e.from)} → <strong>{roundLabel(e.to)}</strong>
              {!domain && <span style={{ color: "var(--text-muted)" }}> · {e.domain}</span>}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
              {e.actor} · {new Date(e.createdAt).toLocaleString()}
              {e.note ? ` · “${e.note}”` : ""}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
};

export default StatusHistory;
