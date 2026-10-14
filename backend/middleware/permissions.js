// Roles: "owner" (everything, plus the audit log), "full" (board: everything but
// the audit log), "viewer" (read-only, plus review comments and interview slots).
// An admin with no role set counts as "full".
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const VIEWER_WRITES = [
  { method: "POST", path: /^\/interview-slots\/?$/ },
  { method: "PUT", path: /^\/reviews\/?$/ },
];

export const enforceRole = (req, res, next) => {
  if (req.user?.role !== "viewer") return next();
  if (READ_METHODS.has(req.method)) return next();
  if (VIEWER_WRITES.some((rule) => rule.method === req.method && rule.path.test(req.path))) return next();
  return res.status(403).json({ message: "Your account is view-only. You can read, comment and add interview slots." });
};

export const requireOwner = (req, res, next) => {
  if (req.user?.role !== "owner") return res.status(403).json({ message: "Owner only." });
  next();
};
