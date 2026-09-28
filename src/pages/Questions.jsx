import React, { useEffect, useState } from "react";
import { adminService } from "../api/services";
import { Card, Button } from "../components/ResultComponents";
import { refreshQuestions } from "../hooks/useQuestions";

// Rubrics tell the AI reviewer (and new reviewers) what a strong answer has.
// Wording is seeded from the candidate backend, so only rubric / active / word
// limit are editable here.
const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [domain, setDomain] = useState("tech");
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    refreshQuestions().then(setQuestions).catch(() => {});
  }, []);

  const save = async (q, fields) => {
    setSaving(q.key);
    try {
      const res = await adminService.updateQuestion(q.key, fields);
      setQuestions((prev) => prev.map((x) => (x.key === q.key ? res.data : x)));
      setDrafts(({ [q.key]: _, ...rest }) => rest);
      refreshQuestions();
    } finally {
      setSaving(null);
    }
  };

  const shown = questions.filter((q) => q.domain === domain);

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Questions & rubrics</h1>
      <p style={{ color: "var(--text-light)", marginBottom: 24 }}>
        Write what a strong answer contains. The AI reviewer scores against these, so better rubrics mean better
        second opinions.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["tech", "design", "management"].map((d) => (
          <Button key={d} variant={d === domain ? "primary" : "outline"} onClick={() => setDomain(d)}>
            {d[0].toUpperCase() + d.slice(1)}
          </Button>
        ))}
      </div>
      {shown.map((q) => {
        const draft = drafts[q.key] ?? q.rubric ?? "";
        return (
          <Card key={q.key} style={{ marginBottom: 16, opacity: q.active ? 1 : 0.5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--primary)", marginBottom: 4 }}>
                  {q.key} · {q.subdomainLabel || "all subdomains"} · {q.audience}
                </div>
                <div style={{ color: "var(--text-main)", marginBottom: 12 }}>
                  {q.kind === "portfolio" ? q.helper : q.prompt}
                </div>
              </div>
              <label style={{ whiteSpace: "nowrap", fontSize: 13, color: "var(--text-muted)" }}>
                <input type="checkbox" checked={q.active} onChange={(e) => save(q, { active: e.target.checked })} /> Active
              </label>
            </div>
            <textarea
              value={draft}
              placeholder="e.g. Mentions labelled vs unlabelled data; gives one realistic example of each; bonus for semi-supervised."
              onChange={(e) => setDrafts((d) => ({ ...d, [q.key]: e.target.value }))}
              style={{ width: "100%", minHeight: 70, background: "var(--bg-dark)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: 8, padding: 10 }}
            />
            {drafts[q.key] !== undefined && drafts[q.key] !== (q.rubric ?? "") && (
              <Button style={{ marginTop: 8 }} disabled={saving === q.key} onClick={() => save(q, { rubric: draft })}>
                {saving === q.key ? "Saving..." : "Save rubric"}
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default Questions;
