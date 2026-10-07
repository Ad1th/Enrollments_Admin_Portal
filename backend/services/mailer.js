import nodemailer from "nodemailer";

let transporter = null;
export const mailConfigured = () => Boolean(process.env.MFC_EMAIL && process.env.MFC_EMAIL_PASSWORD);

const getTransporter = () => {
  transporter ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.MFC_EMAIL, pass: process.env.MFC_EMAIL_PASSWORD },
  });
  return transporter;
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// {{name}}, {{firstName}}, {{regno}}, {{domains}}, {{portalUrl}}, {{interviewDate}}, {{interviewTime}}, {{meetLink}}
export const fillTemplate = (text, user) => {
  const vars = {
    name: user.username || "there",
    firstName: String(user.username || "there").split(" ")[0],
    regno: user.regno || "",
    domains: (user.domain || []).join(", "),
    portalUrl: process.env.CANDIDATE_PORTAL_URL || "",
    interviewDate: user.interviewDate || (user.meeting?.scheduledTime ? new Date(user.meeting.scheduledTime).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }) : "TBA"),
    interviewTime: user.interviewTime || (user.meeting?.scheduledTime ? new Date(user.meeting.scheduledTime).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) : "TBA"),
    meetLink: user.meetLink || user.meeting?.gmeetLink || "",
  };
  return String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => (key in vars ? vars[key] : m));
};


// Plain text in, simple branded HTML out: escaped, links clickable, line
// breaks kept, plus the open-tracking pixel.
export const renderHtml = (text, pixelUrl) => {
  const body = escapeHtml(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#fc7a00">$1</a>')
    .replace(/\n/g, "<br>");
  return `<!doctype html><html><body style="margin:0;background:#121212;padding:24px;font-family:Arial,sans-serif">
<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#1e1e1e;border-radius:12px">
<tr><td style="padding:24px 28px;border-bottom:3px solid #fc7a00;color:#fc7a00;font-weight:bold;font-size:18px">Mozilla Firefox Club, VIT</td></tr>
<tr><td style="padding:28px;color:#eeeeee;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:16px 28px;color:#888;font-size:12px">You're receiving this because you applied to MFC recruitments.</td></tr>
</table>${pixelUrl ? `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block">` : ""}</body></html>`;
};

export const sendMail = ({ to, subject, text, html }) =>
  getTransporter().sendMail({ from: `MFC VIT <${process.env.MFC_EMAIL}>`, to, subject, text, html });
