import AuditLog from "../models/AuditLog.js";

const SECRET_KEY = /pass|token|secret|authorization|cookie/i;
const MAX_STRING = 300;
const MAX_BODY_CHARS = 4000;

const scrub = (value, depth = 0) => {
  if (value == null) return value;
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (typeof value !== "object") return value;
  if (depth > 4) return "[nested]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = SECRET_KEY.test(k) ? "[redacted]" : scrub(v, depth + 1);
  return out;
};

const safeBody = (body) => {
  if (!body || typeof body !== "object" || Object.keys(body).length === 0) return null;
  const cleaned = scrub(body);
  return JSON.stringify(cleaned).length > MAX_BODY_CHARS ? { truncated: true } : cleaned;
};

export const clientIp = (req) =>
  String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();

// Never let logging break a request.
export const writeAudit = async (entry) => {
  try {
    await AuditLog.create(entry);
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
};

// Persists the log row before the response is flushed, so a serverless instance
// that freezes right after replying can't drop it.
export const auditTrail = (req, res, next) => {
  const originalEnd = res.end;
  res.end = function patchedEnd(...args) {
    res.end = originalEnd;
    const write = req.method !== "GET" && req.method !== "HEAD";
    const finish = () => originalEnd.apply(res, args);
    writeAudit({
      kind: write ? "write" : "read",
      actorId: req.user?.id || null,
      actorEmail: req.user?.email || null,
      role: req.user?.role || null,
      method: req.method,
      path: `${req.baseUrl}${req.path}`,
      status: res.statusCode,
      ip: clientIp(req),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 200),
      body: write ? safeBody(req.body) : null,
    }).then(finish, finish);
    return res;
  };
  next();
};
