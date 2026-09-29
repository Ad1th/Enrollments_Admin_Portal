import React from "react";

const cardStyle = {
  marginBottom: "24px",
  backgroundColor: "rgba(255,255,255,0.03)",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid var(--border-color)",
};

// Answers are keyed by question key; show them in question order with the
// prompt the candidate actually saw. Unknown keys (question since removed)
// still render so nothing a candidate wrote is hidden.
const AnswerList = ({ answers = {}, questions = [], renderExtra }) => {
  const known = questions.filter((q) => answers[q.key]);
  const knownKeys = new Set(known.map((q) => q.key));
  const orphans = Object.keys(answers).filter((k) => !knownKeys.has(k) && answers[k]);

  if (known.length === 0 && orphans.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>No answers yet.</p>;
  }

  const item = (key, title, text, q) => (
    <div key={key} style={cardStyle}>
      <h4
        style={{
          fontSize: "12px",
          fontWeight: "bold",
          color: "var(--primary)",
          marginBottom: "8px",
        }}
      >
        {title}
      </h4>
      <p style={{ whiteSpace: "pre-wrap", color: "var(--text-main)", lineHeight: "1.6", fontSize: "14px" }}>
        {text}
      </p>
      {renderExtra && renderExtra(key, text, q)}
    </div>
  );

  return (
    <>
      {known.map((q) =>
        item(
          q.key,
          `${q.subdomainLabel ? `${q.subdomainLabel} · ` : ""}${q.kind === "portfolio" ? "Portfolio / task links" : q.prompt}`,
          answers[q.key],
          q
        )
      )}
      {orphans.map((k) => item(k, k, answers[k], null))}
    </>
  );
};

export default AnswerList;
