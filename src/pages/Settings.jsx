import React, { useEffect, useState } from "react";
import { adminService } from "../api/services";
import { Card, Button } from "../components/ResultComponents";

const GROUPS = [
  ["all", "Everyone (All Domains)"],
  ["tech", "Tech Domain"],
  ["design", "Design Domain"],
  ["management", "Management Domain"],
];

const STANDARD_LINKS = [
  ["whatsapp", "WhatsApp Group", "https://chat.whatsapp.com/..."],
  ["discord", "Discord Invite", "https://discord.gg/..."],
  ["notion", "Onboarding Guide / Notion", "https://notion.so/..."],
  ["calendar", "Club Calendar", "https://calendar.google.com/..."],
  ["other", "General Portal / Drive", "https://drive.google.com/..."],
];

const input = {
  background: "var(--bg-dark)",
  color: "var(--text-main)",
  border: "1px solid var(--border-color)",
  borderRadius: 8,
  padding: "8px 12px",
  width: "100%",
  fontSize: 13,
};

const Settings = () => {
  const [value, setValue] = useState({});
  const [activeGroup, setActiveGroup] = useState("all");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminService.getOnboarding().then((r) => setValue(r.data || {}));
  }, []);

  const setStandard = (group, key, url) => {
    setValue((v) => ({
      ...v,
      [group]: { ...(v[group] || {}), [key]: url },
    }));
  };

  const addCustomLink = (group) => {
    const existing = value[group]?.custom || [];
    setValue((v) => ({
      ...v,
      [group]: {
        ...(v[group] || {}),
        custom: [...existing, { label: "", url: "" }],
      },
    }));
  };

  const updateCustomLink = (group, index, field, val) => {
    const list = [...(value[group]?.custom || [])];
    list[index] = { ...list[index], [field]: val };
    setValue((v) => ({
      ...v,
      [group]: { ...(v[group] || {}), custom: list },
    }));
  };

  const removeCustomLink = (group, index) => {
    const list = (value[group]?.custom || []).filter((_, i) => i !== index);
    setValue((v) => ({
      ...v,
      [group]: { ...(v[group] || {}), custom: list },
    }));
  };

  const save = async () => {
    setLoading(true);
    setStatus("");
    try {
      const res = await adminService.saveOnboarding(value);
      setValue(res.data);
      setStatus("Links saved successfully!");
      setTimeout(() => setStatus(""), 4000);
    } catch (err) {
      setStatus(err.response?.data?.message || "Could not save links");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 1200 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Links & Resources</h1>
        <p style={{ color: "var(--text-light)", fontSize: 14 }}>
          Manage all recruitment and onboarding links shared with candidates when they reach interview rounds or accept offers.
          Domain-specific links override the general <strong>Everyone</strong> links.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {GROUPS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveGroup(id)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${activeGroup === id ? "var(--primary)" : "var(--border-color)"}`,
              background: activeGroup === id ? "var(--primary)" : "var(--bg-card)",
              color: activeGroup === id ? "#fff" : "var(--text-main)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        {/* Standard Channels */}
        <Card>
          <h3 style={{ fontSize: 17, marginBottom: 14, color: "var(--primary)" }}>
            Standard Channels ({GROUPS.find(([g]) => g === activeGroup)?.[1]})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {STANDARD_LINKS.map(([key, name, placeholder]) => {
              const url = value[activeGroup]?.[key] || "";
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>{name}</label>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none" }}
                      >
                        Visit Link ↗
                      </a>
                    )}
                  </div>
                  <input
                    style={input}
                    placeholder={placeholder}
                    value={url}
                    onChange={(e) => setStandard(activeGroup, key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Custom Links */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 17, margin: 0, color: "var(--primary)" }}>Custom Resources & Documents</h3>
            <Button
              variant="outline"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={() => addCustomLink(activeGroup)}
            >
              + Add Link
            </Button>
          </div>

          <p style={{ color: "var(--text-light)", fontSize: 12, marginBottom: 16 }}>
            Add arbitrary links such as Interview Guides, Task Sheets, Notion pages, or Google Drive folders.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 360, overflowY: "auto" }}>
            {(value[activeGroup]?.custom || []).map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: "var(--bg-dark)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    style={{ ...input, flex: 1, padding: "6px 8px" }}
                    placeholder="Link Label (e.g. Task Drive)"
                    value={item.label || ""}
                    onChange={(e) => updateCustomLink(activeGroup, idx, "label", e.target.value)}
                  />
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--primary)", fontSize: 13, textDecoration: "none" }}
                    >
                      ↗
                    </a>
                  )}
                  <button
                    onClick={() => removeCustomLink(activeGroup, idx)}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 15 }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
                <input
                  style={{ ...input, padding: "6px 8px" }}
                  placeholder="https://..."
                  value={item.url || ""}
                  onChange={(e) => updateCustomLink(activeGroup, idx, "url", e.target.value)}
                />
              </div>
            ))}

            {(!value[activeGroup]?.custom || value[activeGroup]?.custom.length === 0) && (
              <p style={{ color: "var(--text-light)", fontSize: 12, textAlign: "center", padding: "16px 0" }}>
                No custom links added for this group yet. Click <strong>+ Add Link</strong> to create one.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Save Bar */}
      <div style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "center" }}>
        <Button onClick={save} disabled={loading}>
          {loading ? "Saving..." : "Save All Links"}
        </Button>
        {status && (
          <span
            style={{
              color: status.includes("success") ? "#22c55e" : "#ef4444",
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            {status}
          </span>
        )}
      </div>
    </div>
  );
};

export default Settings;

