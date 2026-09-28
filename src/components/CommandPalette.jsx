import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../api/services";

export const PAGES = [
  { label: "Dashboard", path: "/" },
  { label: "Participants", path: "/participants" },
  { label: "Tech applicants", path: "/tech" },
  { label: "Design applicants", path: "/design" },
  { label: "Management applicants", path: "/management" },
  { label: "Copy check", path: "/similarity" },
  { label: "Questions & rubrics", path: "/questions" },
  { label: "Interviews", path: "/interviews" },
  { label: "Interviewers", path: "/interviewers" },
  { label: "Comms", path: "/comms" },
  { label: "Stats", path: "/stats" },
  { label: "Onboarding links", path: "/settings" },
];

let usersCache = null;
const loadUsers = () => {
  usersCache ??= adminService
    .getAllUsers(localStorage.getItem("adminId"))
    .then((r) => r.data || [])
    .catch(() => {
      usersCache = null;
      return [];
    });
  return usersCache;
};

const score = (q, text) => {
  const t = text.toLowerCase();
  if (t.startsWith(q)) return 3;
  if (t.split(/\s+/).some((w) => w.startsWith(q))) return 2;
  return t.includes(q) ? 1 : 0;
};

// ⌘K / Ctrl+K from anywhere: jump to a page or open any candidate by name,
// reg no or email.
const CommandPalette = ({ extraPages = [] }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    loadUsers().then(setUsers);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = [...PAGES, ...extraPages].map((p) => ({ type: "page", key: p.path, label: p.label, hint: "Go to", run: () => navigate(p.path) }));
    if (!q) return pages;
    const pageHits = pages.filter((p) => score(q, p.label) > 0);
    const people = users
      .map((u) => ({ u, s: Math.max(score(q, u.username || ""), score(q, u.regno || ""), score(q, u.email || "")) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map(({ u }) => ({
        type: "user",
        key: u._id,
        label: u.username,
        hint: `${u.regno} · ${(u.domain || []).join(", ")}`,
        run: () => navigate(`/participants?open=${u._id}`),
      }));
    return [...people, ...pageHits];
  }, [query, users, navigate, extraPages]);

  if (!open) return null;

  const choose = (item) => {
    setOpen(false);
    item?.run();
  };

  return (
    <div
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", justifyContent: "center", paddingTop: "12vh" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(640px, 92vw)", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, overflow: "hidden", height: "fit-content", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
      >
        <input
          ref={inputRef}
          value={query}
          placeholder="Search candidates or jump to a page..."
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setCursor((c) => Math.min(c + 1, results.length - 1));
            else if (e.key === "ArrowUp") setCursor((c) => Math.max(c - 1, 0));
            else if (e.key === "Enter") choose(results[cursor]);
            else if (e.key === "Escape") setOpen(false);
            else return;
            e.preventDefault();
          }}
          style={{ width: "100%", padding: "16px 20px", fontSize: 16, background: "transparent", border: "none", borderBottom: "1px solid var(--border-color)", color: "var(--text-main)", outline: "none" }}
        />
        <ul style={{ listStyle: "none", margin: 0, padding: 8, maxHeight: 400, overflowY: "auto" }}>
          {results.length === 0 && <li style={{ padding: 12, color: "var(--text-light)" }}>No matches</li>}
          {results.map((r, i) => (
            <li
              key={`${r.type}-${r.key}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => choose(r)}
              style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", background: i === cursor ? "rgba(252,122,0,0.15)" : "transparent" }}
            >
              <span style={{ color: "var(--text-main)" }}>{r.label}</span>
              <span style={{ color: "var(--text-light)", fontSize: 12 }}>{r.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;
