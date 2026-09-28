import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../api/services";
import { Card, Button } from "../components/ResultComponents";

const pct = (n) => `${Math.round(n * 100)}%`;

// Copy check: near-duplicate answers per question and links shared between
// applicants. Click a name to open that candidate.
const Similarity = () => {
  const navigate = useNavigate();
  const [domain, setDomain] = useState("");
  const [minContainment, setMinContainment] = useState(0.7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scan = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.getSimilarity({ domain: domain || undefined, minContainment });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const who = (id) => {
    const u = data?.users?.[id];
    return (
      <button
        onClick={() => navigate(`/participants?open=${id}`)}
        style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0 }}
      >
        {u ? `${u.name} (${u.regno})` : id}
      </button>
    );
  };

  return (
    <div className="container" style={{ maxWidth: 1200 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Copy check</h1>
      <p style={{ color: "var(--text-light)", marginBottom: 24 }}>
        Compares every submitted answer with every other answer to the same question (5-word overlap), and finds
        repo/design links submitted by more than one applicant. Runs on our server, no external API.
      </p>

      <Card style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
        <select value={domain} onChange={(e) => setDomain(e.target.value)} style={{ padding: 8, background: "var(--bg-dark)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: 8 }}>
          <option value="">All domains</option>
          <option value="tech">Tech</option>
          <option value="design">Design</option>
          <option value="management">Management</option>
        </select>
        <label style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Flag when at least{" "}
          <input type="number" min="0.3" max="1" step="0.05" value={minContainment} onChange={(e) => setMinContainment(Number(e.target.value))} style={{ width: 70, padding: 6, background: "var(--bg-dark)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: 6 }} />{" "}
          of the shorter answer appears in the other
        </label>
        <Button onClick={scan} disabled={loading}>{loading ? "Scanning..." : "Scan"}</Button>
        {data && (
          <span style={{ color: "var(--text-light)", fontSize: 13 }}>
            {data.scanned.answers} answers from {data.scanned.submissions} submissions
          </span>
        )}
      </Card>

      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

      {data && (
        <>
          <h2 style={{ fontSize: 20, margin: "24px 0 12px" }}>Suspicious pairs ({data.pairs.length})</h2>
          {data.pairs.length === 0 && <p style={{ color: "var(--text-light)" }}>Nothing above the threshold. 🎉</p>}
          {data.pairs.map((p, i) => (
            <Card key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span>
                  {who(p.a)} ↔ {who(p.b)}
                </span>
                <span style={{ color: p.containment > 0.85 ? "#ef4444" : "#f59e42", fontWeight: 600 }}>
                  {pct(p.containment)} contained · {pct(p.jaccard)} overlap
                </span>
              </div>
              <div style={{ color: "var(--text-light)", fontSize: 13, marginTop: 6 }}>
                {data.questions[p.key]?.subdomainLabel ? `${data.questions[p.key].subdomainLabel} · ` : ""}
                {data.questions[p.key]?.kind === "portfolio" ? "Portfolio" : data.questions[p.key]?.prompt || p.key}
              </div>
            </Card>
          ))}

          {data.clusters.some((c) => c.length > 2) && (
            <>
              <h2 style={{ fontSize: 20, margin: "24px 0 12px" }}>Groups</h2>
              {data.clusters
                .filter((c) => c.length > 2)
                .map((c, i) => (
                  <Card key={i} style={{ marginBottom: 12 }}>
                    {c.length} applicants linked: {c.map((id, j) => <span key={id}>{j > 0 && ", "}{who(id)}</span>)}
                  </Card>
                ))}
            </>
          )}

          <h2 style={{ fontSize: 20, margin: "24px 0 12px" }}>Same link, different applicants ({data.sharedLinks.length})</h2>
          {data.sharedLinks.map((l) => (
            <Card key={l.url} style={{ marginBottom: 12 }}>
              <a href={`https://${l.url}`} target="_blank" rel="noreferrer" style={{ color: "var(--text-main)" }}>{l.url}</a>
              <div style={{ marginTop: 6 }}>{l.ids.map((id, j) => <span key={id}>{j > 0 && ", "}{who(id)}</span>)}</div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

export default Similarity;
