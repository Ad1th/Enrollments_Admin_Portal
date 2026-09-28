import React, { useEffect, useState } from "react";
import { FaGithub, FaFigma } from "react-icons/fa";
import { adminService } from "../api/services";

const GITHUB_RE = /https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+/gi;
const FIGMA_RE = /https?:\/\/(?:www\.)?figma\.com\/(?:file|design|proto|board)\/[^\s)\]]+/gi;
const LEVEL_COLOUR = { good: "#22c55e", warn: "#f59e42", info: "var(--text-light)" };

const RepoCard = ({ url, userId }) => {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminService
      .getRepoReport(url, userId)
      .then((res) => setReport(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not analyse"));
  }, [url, userId]);

  return (
    <div style={{ marginTop: 12, padding: 12, borderRadius: 8, border: "1px solid var(--border-color)", fontSize: 13 }}>
      <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", display: "flex", gap: 6, alignItems: "center" }}>
        <FaGithub /> {url.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
      </a>
      {error && <p style={{ color: "#ef4444", marginTop: 6 }}>{error}</p>}
      {!report && !error && <p style={{ color: "var(--text-light)", marginTop: 6 }}>Analysing repo...</p>}
      {report && !report.ok && <p style={{ color: "#ef4444", marginTop: 6 }}>{report.error}</p>}
      {report?.ok && (
        <>
          <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
            {report.signals.map((s, i) => (
              <li key={i} style={{ color: LEVEL_COLOUR[s.level] }}>
                {s.level === "warn" ? "⚠ " : s.level === "good" ? "✓ " : "· "}
                {s.text}
              </li>
            ))}
          </ul>
          <div style={{ color: "var(--text-light)", marginTop: 6 }}>
            {report.languages.map((l) => `${l.name} ${l.pct}%`).join(" · ")}
            {report.homepage && (
              <>
                {" · "}
                <a href={report.homepage} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
                  live demo
                </a>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Figma files embed inline, loaded on click so a long answer list stays fast.
const FigmaEmbed = ({ url }) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginTop: 12 }}>
      {show ? (
        <iframe
          title={url}
          src={`https://www.figma.com/embed?embed_host=mfc-admin&url=${encodeURIComponent(url)}`}
          style={{ width: "100%", height: 420, border: "1px solid var(--border-color)", borderRadius: 8 }}
          allowFullScreen
        />
      ) : (
        <button
          onClick={() => setShow(true)}
          style={{ background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}
        >
          <FaFigma /> Preview Figma design
        </button>
      )}
    </div>
  );
};

// Rendered under each answer: repo reports for GitHub links, Figma previews,
// and the AI's one-line reason for that question's score.
const LinkInsights = ({ text, userId, aiNote }) => {
  const repos = [...new Set((text.match(GITHUB_RE) || []).map((u) => u.replace(/\.git$/, "").replace(/[.,]$/, "")))].slice(0, 5);
  const figmas = [...new Set(text.match(FIGMA_RE) || [])].slice(0, 3);
  return (
    <>
      {aiNote && (
        <p style={{ marginTop: 8, fontSize: 12, color: "#8aa3ff" }}>
          AI {aiNote.score}/10: {aiNote.reason}
        </p>
      )}
      {repos.map((u) => (
        <RepoCard key={u} url={u} userId={userId} />
      ))}
      {figmas.map((u) => (
        <FigmaEmbed key={u} url={u} />
      ))}
    </>
  );
};

export default LinkInsights;
