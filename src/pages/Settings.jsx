import React, { useEffect, useState } from "react";
import { adminService } from "../api/services";
import { Card, Button } from "../components/ResultComponents";

const GROUPS = [
  ["all", "Everyone"],
  ["tech", "Tech"],
  ["design", "Design"],
  ["management", "Management"],
];
const LINKS = [
  ["whatsapp", "WhatsApp group"],
  ["discord", "Discord invite"],
  ["notion", "Onboarding doc / Notion"],
  ["calendar", "Club calendar"],
  ["other", "Anything else"],
];
const input = {
  background: "var(--bg-dark)",
  color: "var(--text-main)",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: "8px 10px",
  width: "100%",
};

// Links a candidate sees the moment they accept an offer. Domain links
// override the "Everyone" ones.
const Settings = () => {
  const [value, setValue] = useState({});
  const [status, setStatus] = useState("");

  useEffect(() => {
    adminService.getOnboarding().then((r) => setValue(r.data || {}));
  }, []);

  const set = (group, key, url) => setValue((v) => ({ ...v, [group]: { ...(v[group] || {}), [key]: url } }));

  const save = async () => {
    try {
      const res = await adminService.saveOnboarding(value);
      setValue(res.data);
      setStatus("Saved");
    } catch (err) {
      setStatus(err.response?.data?.message || "Could not save");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Onboarding</h1>
      <p style={{ color: "var(--text-light)", marginBottom: 24 }}>
        Selecting a candidate (round 2) creates an offer in their portal. When they accept, they get these links and,
        if GitHub is connected and <code>GITHUB_ORG</code> is set on the candidate backend, an org invite.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 16 }}>
        {GROUPS.map(([group, label]) => (
          <Card key={group}>
            <h3 style={{ marginBottom: 12 }}>{label}</h3>
            {LINKS.map(([key, name]) => (
              <label key={key} style={{ display: "block", marginBottom: 10, fontSize: 13, color: "var(--text-muted)" }}>
                {name}
                <input style={{ ...input, marginTop: 4 }} placeholder="https://..." value={value[group]?.[key] || ""} onChange={(e) => set(group, key, e.target.value)} />
              </label>
            ))}
          </Card>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <Button onClick={save}>Save links</Button>
        {status && <span style={{ color: status === "Saved" ? "#22c55e" : "#ef4444" }}>{status}</span>}
      </div>
    </div>
  );
};

export default Settings;
