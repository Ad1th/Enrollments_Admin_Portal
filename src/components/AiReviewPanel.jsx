import React, { useEffect, useState } from "react";
import { FaRobot, FaSyncAlt } from "react-icons/fa";
import { adminService } from "../api/services";
import { Button } from "./ResultComponents";

const scoreColour = (n) => (n >= 8 ? "#22c55e" : n >= 5 ? "#f59e42" : "#ef4444");
const FLAG_TEXT = {
  possible_ai_generated: "Reads AI-generated",
  off_topic: "Off topic",
  prompt_injection: "Tried to instruct the AI",
  too_short: "Very short",
  copied_question: "Repeats the question",
  plagiarism_suspected: "Plagiarism suspected",
};

// Second opinion, never a decision: shows the model's score, summary and flags,
// and per-question reasoning that AnswerList can pull in via `onReview`.
const AiReviewPanel = ({ userId, domain, hasAnswers, onReview, runSignal }) => {
  const [review, setReview] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | error
  const [error, setError] = useState("");

  useEffect(() => {
    setReview(null);
    adminService
      .getAiReviews(userId)
      .then((res) => {
        const r = (res.data || []).find((x) => x.domain === domain) || null;
        setReview(r);
        onReview?.(r);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, domain]);

  const run = async (force) => {
    setState("loading");
    setError("");
    try {
      const res = await adminService.runAiReview(userId, domain, force);
      setReview(res.data);
      onReview?.(res.data);
      setState("idle");
    } catch (err) {
      setError(err.response?.data?.message || "AI review failed");
      setState("error");
    }
  };

  // Keyboard shortcut "A" in the modal bumps runSignal.
  useEffect(() => {
    if (runSignal && hasAnswers) run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSignal]);

  if (!hasAnswers) return null;

  return (
    <div
      style={{
        marginBottom: 24,
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--border-color)",
        background: "rgba(97,131,255,0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
          <FaRobot /> AI second opinion
        </span>
        <Button variant="outline" onClick={() => run(Boolean(review))} disabled={state === "loading"} title="Shortcut: A">
          <FaSyncAlt /> {state === "loading" ? "Reviewing..." : review ? "Re-run" : "Run AI review"}
        </Button>
      </div>
      {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
      {review ? (
        <>
          <div style={{ display: "flex", gap: 16, alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: scoreColour(review.overall) }}>{review.overall}/10</span>
            <span style={{ color: "var(--text-light)", fontSize: 12 }}>
              confidence {review.confidence} · {review.model}
            </span>
          </div>
          <p style={{ color: "var(--text-main)", fontSize: 14, marginBottom: 8 }}>{review.summary}</p>
          {review.flags?.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {review.flags.map((f) => (
                <span key={f} className="badge warning">
                  {FLAG_TEXT[f] || f}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
            <ul style={{ margin: 0, paddingLeft: 16, color: "#22c55e" }}>
              {(review.strengths || []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <ul style={{ margin: 0, paddingLeft: 16, color: "#f59e42" }}>
              {(review.concerns || []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        state !== "loading" && (
          <p style={{ color: "var(--text-light)", fontSize: 13 }}>
            Not reviewed yet. The AI never decides; use it to spot what to read closely.
          </p>
        )
      )}
    </div>
  );
};

export default AiReviewPanel;
