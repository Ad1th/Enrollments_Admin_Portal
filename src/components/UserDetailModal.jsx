import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Card, Button } from "./ResultComponents";
import {
  FaTimes,
  FaGithub,
  FaLinkedin,
  FaGlobe,
  FaLevelUpAlt,
  FaUndo,
  FaBan,
} from "react-icons/fa";
import { adminService } from "../api/services";
import { useQuestions } from "../hooks/useQuestions";
import AnswerList from "./AnswerList";
import StatusHistory, { roundLabel } from "./StatusHistory";
import AiReviewPanel from "./AiReviewPanel";
import ReviewScore from "./ReviewScore";
import LinkInsights from "./LinkInsights";
import ShortcutHelp from "./ShortcutHelp";
import { useAuth } from "../context/AuthContext";

const isTyping = (el) =>
  el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

const UserDetailModal = ({ user, onClose, onUserUpdate, users = [], onNavigate }) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [updating, setUpdating] = useState(false);
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState(user?.adminNotes || "");
  const questions = useQuestions();
  const { adminEmail } = useAuth();
  const [aiReviews, setAiReviews] = useState({});
  const [aiSignal, setAiSignal] = useState(0);
  const [scoreSignal, setScoreSignal] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    adminService
      .getHistory(user._id)
      .then((res) => setHistory(res.data || []))
      .catch(() => setHistory([]));
  }, [user?._id]);

  // Re-read offers whenever a round changes, since selecting creates one.
  useEffect(() => {
    if (!user?._id) return;
    adminService
      .getOffers(user._id)
      .then((res) => setOffers(res.data || []))
      .catch(() => setOffers([]));
  }, [user?._id, history.length]);

  const index = users.findIndex((u) => u._id === user?._id);
  const tabs = ["profile", ...["tech", "design", "management"].filter((d) => (user?.domain || []).includes(d))];

  // Keyboard-first review. Ignored while typing in notes.
  useEffect(() => {
    if (!user) return undefined;
    const onKey = (e) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const domainTab = ["tech", "design", "management"].includes(activeTab) ? activeTab : null;
      const key = e.key.toLowerCase();
      if (key === "escape") return showHelp ? setShowHelp(false) : onClose();
      if (key === "?") return setShowHelp((v) => !v);
      if ((key === "j" || key === "arrowdown") && index < users.length - 1) return onNavigate?.(users[index + 1]);
      if ((key === "k" || key === "arrowup") && index > 0) return onNavigate?.(users[index - 1]);
      if (key === "]" || key === "l") return setActiveTab(tabs[(tabs.indexOf(activeTab) + 1) % tabs.length]);
      if (key === "[" || key === "h") return setActiveTab(tabs[(tabs.indexOf(activeTab) - 1 + tabs.length) % tabs.length]);
      if (!domainTab || updating) return;
      if (key === "p") return handleUpdateStatus(domainTab, "promote");
      if (key === "x") return handleUpdateStatus(domainTab, "reject");
      if (key === "u") return handleUpdateStatus(domainTab, "reset");
      if (key === "a") return setAiSignal((n) => n + 1);
      if (/^[1-5]$/.test(key)) return setScoreSignal({ n: Number(key), at: Date.now() });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Open on the first applied domain rather than the profile when reviewing.
  useEffect(() => {
    setActiveTab((t) => (t === "profile" || !tabs.includes(t) ? tabs[1] || "profile" : t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  if (!user) return null;

  const domains = ["tech", "design", "management"];
  const userDomains = user.domain || [];

  const getTask = (domain) => {
    const taskKey = `${domain}Tasks`;
    const tasks = user[taskKey];
    return tasks && tasks.length > 0 ? tasks[0] : null;
  };

  const handleUpdateStatus = async (domain, action) => {
    setUpdating(true);
    try {
      let newLevel = user[domain] || 0;
      if (action === "promote") newLevel += 1;
      if (action === "reject") newLevel = -1;
      if (action === "reset") newLevel = 0;

      const updates = { [domain]: newLevel };
      const result = await adminService.updateUserStatus(user.regno, updates);
      if (result.events?.length) setHistory((h) => [...result.events.reverse(), ...h]);
      if (onUserUpdate) onUserUpdate({ ...user, ...updates });
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };


  const handleSaveNotes = async () => {
    setUpdating(true);
    try {
      const result = await adminService.updateUserStatus(user.regno, {
        adminNotes: notes,
      });
      if (onUserUpdate) onUserUpdate({ ...user, adminNotes: notes });
      alert("Notes saved successfully!");
    } catch (error) {
      console.error("Failed to save notes", error);
      alert("Failed to save notes");
    } finally {
      setUpdating(false);
    }
  };

  const renderTaskContent = (domain) => {
    const task = getTask(domain);
    const currentLevel = user[domain] !== undefined ? user[domain] : 0;

    const content = (
      <>
        <div
          style={{
            padding: "16px",
            backgroundColor: "rgba(252, 122, 0, 0.05)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Current Level
            </span>
            <span
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: currentLevel === -1 ? "#ef4444" : "var(--primary)",
              }}
            >
              {roundLabel(currentLevel).toUpperCase()}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="primary"
              onClick={() => handleUpdateStatus(domain, "promote")}
              disabled={updating || currentLevel >= 3 || currentLevel === -1}
              title="Promote to Next Round"
            >
              <FaLevelUpAlt /> Promote
            </Button>
            <Button
              variant="outline"
              style={{ borderColor: "#ef4444", color: "#ef4444" }}
              onClick={() => handleUpdateStatus(domain, "reject")}
              disabled={updating || currentLevel === -1}
              title="Reject Candidate"
            >
              <FaBan /> Reject
            </Button>
            <Button
              variant="outline"
              onClick={() => handleUpdateStatus(domain, "reset")}
              disabled={updating || currentLevel === 0}
              title="Reset to Round 0"
            >
              <FaUndo /> Reset
            </Button>
          </div>
        </div>

        {(() => {
          const offer = offers.find((o) => o.domain === domain);
          const meetingDomains = user.meetingTime ? " · interview booked for " + new Date(user.meetingTime).toLocaleString() : "";
          if (!offer && !meetingDomains) return null;
          const colour = { pending: "#f59e42", accepted: "#22c55e", declined: "#ef4444", revoked: "var(--text-light)" };
          return (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              {offer && (
                <>
                  Offer: <strong style={{ color: colour[offer.status] }}>{offer.status}</strong>
                  {offer.status === "accepted" && ` · GitHub invite: ${offer.onboarding?.github?.status || "n/a"}`}
                </>
              )}
              {meetingDomains}
              {user.interviewers?.length ? ` · panel: ${user.interviewers.map((e) => e.split("@")[0]).join(", ")}` : ""}
            </p>
          );
        })()}

        <ReviewScore userId={user._id} domain={domain} me={adminEmail} scoreSignal={scoreSignal} />

        <AiReviewPanel
          userId={user._id}
          domain={domain}
          hasAnswers={Boolean(task && Object.keys(task.answers || {}).length)}
          runSignal={aiSignal}
          onReview={(r) => setAiReviews((prev) => ({ ...prev, [domain]: r }))}
        />

        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: "bold", color: "var(--text-light)", marginBottom: "8px" }}>
            Round history
          </h4>
          <StatusHistory events={history} domain={domain} />
        </div>

        {/* Interviewer Notes Section */}
        <div style={{ marginBottom: "24px" }}>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              color: "var(--text-light)",
              marginBottom: "8px",
            }}
          >
            Interviewer Notes
          </h4>
          <div style={{ display: "flex", gap: "8px" }}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add comments about the candidate here..."
              style={{
                flex: 1,
                backgroundColor: "var(--bg-dark)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "12px",
                color: "var(--text-main)",
                minHeight: "80px",
                outline: "none",
                resize: "vertical",
              }}
            />
            <Button
              onClick={handleSaveNotes}
              disabled={updating}
              style={{ height: "fit-content" }}
            >
              Save
            </Button>
          </div>
        </div>

        {!task ? (
          userDomains.includes(domain) ? (
            <p style={{ color: "var(--text-muted)" }}>
              User did not apply for {domain}.
            </p>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>
              No task submission found.
            </p>
          )
        ) : (
          <>
            <div
              style={{
                marginBottom: "16px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: "600", color: "var(--text-light)" }}>
                Status:
              </span>
              <span className={`badge ${task.isDone ? "success" : "warning"}`}>
                {task.isDone ? "Submitted" : "Draft / In Progress"}
              </span>
            </div>

            {task.subdomain && (
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontWeight: "600", color: "var(--text-light)" }}>
                  Subdomains:{" "}
                </span>
                <span style={{ color: "var(--text-main)" }}>
                  {task.subdomain.join(", ")}
                </span>
              </div>
            )}

            <AnswerList
              answers={task.answers || {}}
              questions={questions.filter((q) => q.domain === domain)}
              renderExtra={(key, text) => (
                <LinkInsights
                  text={text}
                  userId={user._id}
                  aiNote={aiReviews[domain]?.perQuestion?.find((p) => p.key === key)}
                />
              )}
            />
          </>
        )}
      </>
    );

    return (
      <div style={{ marginTop: "16px" }} className="fade-in">
        {content}
      </div>
    );
  };

  // Portalled to <body>: the page wrapper animates with a transform, which
  // would otherwise make this "fixed" overlay relative to the wrapper.
  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        backdropFilter: "blur(5px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          borderRadius: "16px",
          width: "90%",
          maxWidth: "900px",
          height: "85%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          border: "1px solid var(--border-color)",
          animation: "slideIn 0.3s ease-out",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "var(--text-main)",
              }}
            >
              {user.username}
            </h2>
            <p style={{ color: "var(--text-light)", fontFamily: "monospace" }}>
              {user.regno}
              {index >= 0 && users.length > 1 && (
                <span style={{ marginLeft: 12, fontFamily: "inherit" }}>
                  {index + 1} / {users.length} · J/K to move · ? for shortcuts
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "24px",
              cursor: "pointer",
              color: "var(--text-muted)",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.color = "white")}
            onMouseLeave={(e) => (e.target.style.color = "var(--text-muted)")}
          >
            <FaTimes />
          </button>
        </div>

        {showHelp && <ShortcutHelp onClose={() => setShowHelp(false)} />}

        {/* Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Sidebar Tabs */}
          <div
            style={{
              width: "220px",
              backgroundColor: "rgba(0,0,0,0.2)",
              borderRight: "1px solid var(--border-color)",
              padding: "16px",
            }}
          >
            <button
              onClick={() => setActiveTab("profile")}
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                textAlign: "left",
                borderRadius: "8px",
                marginBottom: "8px",
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  activeTab === "profile" ? "var(--primary)" : "transparent",
                color: activeTab === "profile" ? "white" : "var(--text-muted)",
                fontWeight: activeTab === "profile" ? "600" : "500",
                transition: "all 0.2s",
              }}
            >
              Profile Info
            </button>
            <div
              style={{
                height: "1px",
                backgroundColor: "var(--border-color)",
                margin: "16px 0",
              }}
            ></div>
            {domains.map((d) => (
              <button
                key={d}
                onClick={() => setActiveTab(d)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px",
                  textAlign: "left",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor:
                    activeTab === d ? "rgba(255,255,255,0.1)" : "transparent",
                  color:
                    activeTab === d
                      ? d === "tech"
                        ? "#8aa3ff"
                        : d === "design"
                          ? "#ff9dbf"
                          : "#69ffc3"
                      : "var(--text-muted)",
                  fontWeight: activeTab === d ? "600" : "400",
                  borderLeft:
                    activeTab === d
                      ? `3px solid ${d === "tech" ? "#8aa3ff" : d === "design" ? "#ff9dbf" : "#69ffc3"}`
                      : "3px solid transparent",
                  opacity: userDomains.includes(d) ? 1 : 0.4,
                }}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)} Task
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
            {activeTab === "profile" && (
              <div className="fade-in">
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginBottom: "24px",
                    color: "var(--text-main)",
                  }}
                >
                  Personal Information
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "24px",
                  }}
                >
                  <div
                    style={{
                      padding: "16px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "var(--text-light)",
                        marginBottom: "4px",
                        textTransform: "uppercase",
                      }}
                    >
                      Email (VIT)
                    </label>
                    <div
                      style={{ color: "var(--text-main)", fontSize: "15px" }}
                    >
                      {user.email}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "16px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "var(--text-light)",
                        marginBottom: "4px",
                        textTransform: "uppercase",
                      }}
                    >
                      Mobile
                    </label>
                    <div
                      style={{ color: "var(--text-main)", fontSize: "15px" }}
                    >
                      {user.mobile || "N/A"}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "16px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "var(--text-light)",
                        marginBottom: "4px",
                        textTransform: "uppercase",
                      }}
                    >
                      Personal Email
                    </label>
                    <div
                      style={{ color: "var(--text-main)", fontSize: "15px" }}
                    >
                      {user.emailpersonal || "N/A"}
                    </div>
                  </div>
                </div>

                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginTop: "32px",
                    marginBottom: "24px",
                    color: "var(--text-main)",
                  }}
                >
                  Links
                </h3>
                <div style={{ display: "flex", gap: "16px" }}>
                  <Button variant="outline">
                    <FaGithub /> GitHub
                  </Button>
                  <Button variant="outline">
                    <FaLinkedin /> LinkedIn
                  </Button>
                  <Button variant="outline">
                    <FaGlobe /> Portfolio
                  </Button>
                </div>
              </div>
            )}

            {domains.includes(activeTab) && (
              <div className="fade-in">
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    marginBottom: "24px",
                    color: "var(--text-main)",
                  }}
                >
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Task
                  Submission
                </h3>
                {renderTaskContent(activeTab)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    ,
    document.body
  );
};

export default UserDetailModal;
