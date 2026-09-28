import React, { useEffect, useState } from "react";
import { adminService } from "../api/services";

// Your 1-5 score for this candidate/domain plus everyone else's. Keys 1-5 in
// the modal call setScore through `scoreSignal`.
const ReviewScore = ({ userId, domain, me, scoreSignal }) => {
  const [reviews, setReviews] = useState([]);
  const mine = reviews.find((r) => r.reviewer === me && r.domain === domain);
  const others = reviews.filter((r) => r.domain === domain && r.reviewer !== me);
  const all = reviews.filter((r) => r.domain === domain);
  const mean = all.length ? (all.reduce((a, r) => a + r.score, 0) / all.length).toFixed(1) : null;

  useEffect(() => {
    adminService
      .getReviews(userId)
      .then((res) => setReviews(res.data || []))
      .catch(() => setReviews([]));
  }, [userId]);

  const setScore = async (score) => {
    const res = await adminService.saveReview(userId, domain, mine?.score === score ? null : score);
    setReviews((prev) => [
      ...prev.filter((r) => !(r.reviewer === me && r.domain === domain)),
      ...(res.data ? [res.data] : []),
    ]);
  };

  useEffect(() => {
    if (scoreSignal?.n) setScore(scoreSignal.n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreSignal]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, color: "var(--text-light)" }}>Your score</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => setScore(n)}
          title={`Shortcut: ${n}`}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            cursor: "pointer",
            border: "1px solid var(--border-color)",
            background: mine?.score === n ? "var(--primary)" : "transparent",
            color: mine?.score === n ? "white" : "var(--text-muted)",
            fontWeight: 700,
          }}
        >
          {n}
        </button>
      ))}
      {mean && (
        <span style={{ fontSize: 13, color: "var(--text-light)" }}>
          Panel mean <strong style={{ color: "var(--text-main)" }}>{mean}</strong> from {all.length}
          {others.length > 0 && ` (${others.map((r) => `${r.reviewer.split("@")[0]}: ${r.score}`).join(", ")})`}
        </span>
      )}
    </div>
  );
};

export default ReviewScore;
