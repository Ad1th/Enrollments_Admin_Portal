import React from "react";

const SHORTCUTS = [
  ["J / ↓", "Next candidate"],
  ["K / ↑", "Previous candidate"],
  ["] / L", "Next tab"],
  ["[ / H", "Previous tab"],
  ["P", "Promote in this domain"],
  ["X", "Reject in this domain"],
  ["U", "Reset to round 0"],
  ["1 – 5", "Your score (press again to clear)"],
  ["A", "Run AI review"],
  ["⌘K / Ctrl K", "Command palette (anywhere)"],
  ["?", "Toggle this help"],
  ["Esc", "Close"],
];

const ShortcutHelp = ({ onClose }) => (
  <div
    onClick={onClose}
    style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center" }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 12, padding: 24, minWidth: 320 }}
    >
      <h3 style={{ marginBottom: 16, color: "var(--text-main)" }}>Keyboard shortcuts</h3>
      <table style={{ fontSize: 14 }}>
        <tbody>
          {SHORTCUTS.map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: "4px 16px 4px 0" }}>
                <kbd style={{ background: "var(--bg-dark)", border: "1px solid var(--border-color)", borderRadius: 4, padding: "2px 6px", color: "var(--primary)" }}>{k}</kbd>
              </td>
              <td style={{ color: "var(--text-muted)" }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default ShortcutHelp;
