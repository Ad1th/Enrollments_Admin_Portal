import React, { useEffect, useState } from "react";
import { adminService } from "../api/services";
import { Card, Button } from "../components/ResultComponents";
import { refreshQuestions } from "../hooks/useQuestions";

// ─────────────────────────────────────────────────────────────────────────────
// ALL constants and sub-components live at MODULE scope.
// Nothing is defined inside the Questions function.
// This is critical — any component defined inside a parent re-renders with a
// new identity on every setState, causing React to unmount+remount inputs,
// which loses focus after every keystroke.
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "",
  prompt: "",
  resources: [],
  subdomain: "",
  subdomainLabel: "",
  audience: "all",
  kind: "long",
  order: 0,
  maxWords: 2000,
  active: true,
};

// Style objects at module scope — never recreated on render
const S = {
  label:    { fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 },
  select:   { width: "100%", padding: "10px", borderRadius: 8, background: "var(--bg-dark)", color: "var(--text-main)", border: "1px solid var(--border-color)", outline: "none" },
  input:    { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", outline: "none", fontSize: 14, backgroundColor: "var(--bg-dark)", color: "var(--text-main)", caretColor: "var(--primary)" },
  textarea: { width: "100%", background: "var(--bg-dark)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: 8, padding: 10, outline: "none", resize: "vertical", fontSize: 14 },
  badgeOrange: { fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(252,122,0,0.15)", color: "var(--primary)", fontWeight: 600 },
  badgeMuted:  { fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.1)", color: "var(--text-muted)", textTransform: "capitalize" },
  badgeDim:    { fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: "var(--text-light)" },
  addLinkBtn: { fontSize: 12, padding: "4px 10px", background: "rgba(252,122,0,0.15)", color: "var(--primary)", border: "1px solid var(--primary)", borderRadius: 6, cursor: "pointer" },
  removeLinkBtn: { padding: "6px 10px", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 6, cursor: "pointer", fontSize: 13, flexShrink: 0 },
};

import { createPortal } from "react-dom";

const ModalOverlay = ({ children }) => (
  createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex" }}>
      <div style={{ marginLeft: "260px", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        {children}
      </div>
    </div>,
    document.body
  )
);

const ErrorBanner = ({ msg }) => (
  <div style={{ padding: 10, background: "rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
    {msg}
  </div>
);

// FormFields receives all mutable state as props.
// Using native <input> and <textarea> directly (not the Input wrapper) to
// eliminate any possibility that a wrapped component causes remounts.
const FormFields = ({ formData, setFormData, addResource, removeResource, updateResource }) => (
  <>
    {/* Row 1: Title + Classification */}
    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
      <div style={{ flex: 1 }}>
        <label style={S.label}>Title (short identifier shown on card)</label>
        <input
          type="text"
          placeholder="e.g. Secret Santa Assigner API"
          value={formData.title}
          onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
          style={S.input}
        />
      </div>
      <div style={{ width: 150 }}>
        <label style={S.label}>Classification</label>
        <select
          value={formData.audience}
          onChange={(e) => setFormData((f) => ({ ...f, audience: e.target.value }))}
          style={S.select}
        >
          <option value="junior">Junior</option>
          <option value="senior">Senior</option>
          <option value="all">Common (All)</option>
        </select>
      </div>
    </div>

    {/* Row 2: Subdomain Key + Display Label */}
    <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
      <div style={{ flex: 1 }}>
        <label style={S.label}>Subdomain Key</label>
        <input
          type="text"
          placeholder="e.g. backend, frontend, ui-ux"
          value={formData.subdomain}
          onChange={(e) =>
            setFormData((f) => ({
              ...f,
              subdomain: e.target.value,
            }))
          }
          style={S.input}
        />
      </div>
      <div style={{ flex: 1 }}>
        <label style={S.label}>Subdomain Display Label</label>
        <input
          type="text"
          placeholder="e.g. Backend, UI/UX"
          value={formData.subdomainLabel}
          onChange={(e) => setFormData((f) => ({ ...f, subdomainLabel: e.target.value }))}
          style={S.input}
        />
      </div>
    </div>

    {/* Task Prompt */}
    <div style={{ marginBottom: 12 }}>
      <label style={S.label}>Task Prompt / Description *</label>
      <textarea
        required
        rows={8}
        placeholder={
          "Objective:\n\nCore Requirements:\n\nBonus Points:\n\nDeliverables:"
        }
        value={formData.prompt}
        onChange={(e) => setFormData((f) => ({ ...f, prompt: e.target.value }))}
        style={S.textarea}
      />
    </div>

    {/* Resource Links */}
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={S.label}>Resource Links (Optional)</label>
        <button type="button" onClick={addResource} style={S.addLinkBtn}>
          + Add Link
        </button>
      </div>
      {formData.resources.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
          No links added. Click &quot;+ Add Link&quot; to attach a URL for candidates.
        </p>
      )}
      {formData.resources.map((url, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="https://example.com/resource"
            value={url}
            onChange={(e) => updateResource(i, e.target.value)}
            style={{ ...S.input, flex: 1 }}
          />
          <button type="button" onClick={() => removeResource(i)} style={S.removeLinkBtn}>
            ✕
          </button>
        </div>
      ))}
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────
const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [domain, setDomain] = useState("tech");
  const [audienceFilter, setAudienceFilter] = useState("all_audiences");
  const [subdomainsList, setSubdomainsList] = useState([]);
  const [subdomainFilter, setSubdomainFilter] = useState("all_subdomains");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1);
  const [deleteError, setDeleteError] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadAll = async () => {
    try {
      const qData = await refreshQuestions();
      setQuestions(qData || []);
    } catch (e) {
      console.error("Failed to load questions", e);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const domainsList = React.useMemo(() => {
    const set = new Set(["tech", "design", "management"]);
    questions.forEach((q) => { if (q.domain) set.add(q.domain); });
    return Array.from(set);
  }, [questions]);

  useEffect(() => {
    const dqs = questions.filter((q) => q.domain === domain);
    const subMap = new Map();
    dqs.forEach((q) => {
      if (q.subdomain && !subMap.has(q.subdomain)) {
        let label = q.subdomainLabel || q.subdomain;
        if (typeof label === "string" && label.length > 0) {
          label = label.charAt(0).toUpperCase() + label.slice(1);
        }
        subMap.set(q.subdomain, { value: q.subdomain, label });
      }
    });

    if (subMap.size === 0) {
      const fallbacks = {
        tech: [
          { value: "frontend", label: "Frontend" },
          { value: "backend", label: "Backend" },
          { value: "app", label: "App Dev" },
          { value: "ml", label: "AI/ML" },
          { value: "cyber-sec", label: "Cyber Security" },
          { value: "cp", label: "CP" },
        ],
        design: [
          { value: "poster", label: "Poster" },
          { value: "ui-ux", label: "UI/UX" },
          { value: "video", label: "Video" },
        ],
        management: [
          { value: "outreach", label: "Outreach" },
          { value: "general-ops", label: "General Ops" },
          { value: "publicity", label: "Publicity" },
          { value: "events", label: "Events" },
        ],
      };
      const list = fallbacks[domain] || [];
      list.forEach((item) => subMap.set(item.value, item));
    }

    setSubdomainsList(Array.from(subMap.values()));
  }, [domain, questions]);

  const resetForm = () => { setFormData(EMPTY_FORM); setErrorMsg(""); };

  const handleOpenAdd = () => { resetForm(); setShowAddModal(true); };

  const handleOpenEdit = (task) => {
    setFormData({
      title: task.title || "",
      prompt: task.prompt || "",
      resources: Array.isArray(task.resources) ? [...task.resources] : [],
      subdomain: task.subdomain || "",
      subdomainLabel: task.subdomainLabel || "",
      audience: task.audience || "all",
      kind: task.kind || "long",
      order: task.order || 0,
      maxWords: task.maxWords || 2000,
      active: task.active !== false,
    });
    setEditingTask(task);
    setErrorMsg("");
  };

  const addResource    = () => setFormData((f) => ({ ...f, resources: [...f.resources, ""] }));
  const removeResource = (i) => setFormData((f) => ({ ...f, resources: f.resources.filter((_, idx) => idx !== i) }));
  const updateResource = (i, val) => setFormData((f) => { const r = [...f.resources]; r[i] = val; return { ...f, resources: r }; });

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!formData.prompt.trim()) { setErrorMsg("Task Description is required."); return; }
    setSaving(true); setErrorMsg("");
    try {
      await adminService.createQuestion({
        ...formData,
        domain,
        resources: formData.resources.filter((r) => r.trim()),
      });
      setShowAddModal(false); resetForm(); await loadAll();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to create task");
    } finally { setSaving(false); }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!formData.prompt.trim()) { setErrorMsg("Task Description is required."); return; }
    setSaving(true); setErrorMsg("");
    try {
      await adminService.updateQuestion(editingTask.key, {
        ...formData,
        resources: formData.resources.filter((r) => r.trim()),
      });
      setEditingTask(null); resetForm(); await loadAll();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to update task");
    } finally { setSaving(false); }
  };

  const handleDeleteClick = (task) => { setDeletingTask(task); setDeleteConfirmStep(1); setDeleteError(null); };

  const handleConfirmDelete = async () => {
    if (deleteConfirmStep === 1) { setDeleteConfirmStep(2); return; }
    setSaving(true); setDeleteError(null);
    try {
      await adminService.deleteQuestion(deletingTask.key);
      setDeletingTask(null); setDeleteConfirmStep(1); await loadAll();
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete task");
    } finally { setSaving(false); }
  };

  const toggleActive = async (task) => {
    try { await adminService.updateQuestion(task.key, { active: !task.active }); await loadAll(); }
    catch (err) { console.error(err); }
  };

  const shown = questions.filter((q) => {
    if (q.domain !== domain) return false;
    if (audienceFilter !== "all_audiences" && q.audience !== audienceFilter) return false;
    if (subdomainFilter !== "all_subdomains" && q.subdomain !== subdomainFilter) return false;
    return true;
  });

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Task &amp; Question Management</h1>
          <p style={{ color: "var(--text-light)", margin: 0 }}>
            Manage tasks, classifications (Junior / Senior / Common), and AI reviewer rubrics for all recruitment domains.
          </p>
        </div>
        <button
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, backgroundColor: "var(--primary)", color: "#fff" }}
          onClick={handleOpenAdd}
        >
          + Add New Task
        </button>
      </div>

      {/* Domain Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {domainsList.map((d) => (
          <button
            key={d}
            onClick={() => { setDomain(d); setSubdomainFilter("all_subdomains"); }}
            style={{
              padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
              border: d === domain ? "none" : "1px solid var(--border-color)",
              backgroundColor: d === domain ? "var(--primary)" : "transparent",
              color: d === domain ? "#fff" : "var(--text-muted)",
            }}
          >
            {d[0].toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24, padding: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>Classification:</label>
          <select value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)} style={S.select}>
            <option value="all_audiences">All Classifications</option>
            <option value="junior">Junior Only</option>
            <option value="senior">Senior Only</option>
            <option value="all">Common (All)</option>
          </select>
        </div>
        {subdomainsList.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>Subdomain:</label>
            <select value={subdomainFilter} onChange={(e) => setSubdomainFilter(e.target.value)} style={S.select}>
              <option value="all_subdomains">All Subdomains</option>
              {subdomainsList.map((sd) => (
                <option key={sd.value} value={sd.value}>
                  {sd.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)" }}>
          Showing <strong>{shown.length}</strong> task(s)
        </div>
      </Card>

      {/* Task List */}
      {shown.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          No tasks found for the selected criteria.
        </Card>
      ) : (
        shown.map((q) => (
          <Card key={q.key} style={{ marginBottom: 16, opacity: q.active ? 1 : 0.55 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: "bold", whiteSpace: "nowrap" }}>{q.key}</span>
                <span style={S.badgeOrange}>{q.subdomainLabel || q.subdomain || "All Subdomains"}</span>
                <span style={S.badgeMuted}>{q.audience === "all" ? "Common" : q.audience}</span>
                <span style={S.badgeDim}>Kind: {q.kind}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                <label style={{ whiteSpace: "nowrap", fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
                  <input type="checkbox" checked={q.active !== false} onChange={() => toggleActive(q)} style={{ marginRight: 6 }} />
                  Active
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleOpenEdit(q)} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => handleDeleteClick(q)} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            </div>
            {q.title && <h3 style={{ fontSize: 18, margin: "0 0 6px 0", color: "var(--text-main)" }}>{q.title}</h3>}
            <div style={{ color: "var(--text-main)", fontSize: 14, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>
              {q.prompt}
            </div>
            {Array.isArray(q.resources) && q.resources.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                🔗 {q.resources.length} link(s):{" "}
                {q.resources.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", marginRight: 8, wordBreak: "break-all" }}>{url}</a>
                ))}
              </div>
            )}
          </Card>
        ))
      )}

      {/* ── ADD MODAL ── */}
      {showAddModal && (
        <ModalOverlay>
          <Card style={{ width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Add New Task ({domain.toUpperCase()})</h2>
            {errorMsg && <ErrorBanner msg={errorMsg} />}
            <form onSubmit={handleSaveAdd}>
              <FormFields
                formData={formData}
                setFormData={setFormData}
                addResource={addResource}
                removeResource={removeResource}
                updateResource={updateResource}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>{saving ? "Creating..." : "Create Task"}</button>
              </div>
            </form>
          </Card>
        </ModalOverlay>
      )}

      {/* ── EDIT MODAL ── */}
      {editingTask && (
        <ModalOverlay>
          <Card style={{ width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>Edit Task ({editingTask.key})</h2>
            {errorMsg && <ErrorBanner msg={errorMsg} />}
            <form onSubmit={handleSaveEdit}>
              <FormFields
                formData={formData}
                setFormData={setFormData}
                addResource={addResource}
                removeResource={removeResource}
                updateResource={updateResource}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setEditingTask(null)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </Card>
        </ModalOverlay>
      )}

      {/* ── DELETE MODAL ── */}
      {deletingTask && (
        <ModalOverlay>
          <Card style={{ width: "100%", maxWidth: 450, borderColor: "#ef4444" }}>
            <h2 style={{ fontSize: 18, color: "#ef4444", marginBottom: 12 }}>
              {deleteConfirmStep === 1 ? "Delete Task?" : "Confirm Final Deletion!"}
            </h2>
            {deleteError ? (
              <div style={{ padding: 10, background: "rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                {deleteError}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>
                {deleteConfirmStep === 1
                  ? <>Are you sure you want to delete <strong>&quot;{deletingTask.title || deletingTask.key}&quot;</strong>?</>
                  : <>This is permanent. Delete <strong>&quot;{deletingTask.key}&quot;</strong> forever?</>}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => { setDeletingTask(null); setDeleteError(null); }} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              {!deleteError && (
                <button disabled={saving} onClick={handleConfirmDelete} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                  {saving ? "Deleting..." : deleteConfirmStep === 1 ? "Proceed" : "Permanently Delete"}
                </button>
              )}
            </div>
          </Card>
        </ModalOverlay>
      )}
    </div>
  );
};

export default Questions;
