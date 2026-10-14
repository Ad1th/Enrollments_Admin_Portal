import AuditLog from "../models/AuditLog.js";

// GET ?limit=100&before=<iso>&actor=<email part>&kind=login|read|write&status=<n>&q=<path part>
export const listAuditLogs = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
  const filter = {};
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (!Number.isNaN(before.getTime())) filter.at = { $lt: before };
  }
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (req.query.actor) filter.actorEmail = { $regex: esc(req.query.actor), $options: "i" };
  if (["login", "read", "write"].includes(req.query.kind)) filter.kind = req.query.kind;
  if (req.query.status) filter.status = Number(req.query.status);
  if (req.query.q) filter.path = { $regex: esc(req.query.q), $options: "i" };

  const rows = await AuditLog.find(filter).sort({ at: -1 }).limit(limit).lean();
  res.json({
    success: true,
    data: rows,
    nextBefore: rows.length === limit ? rows[rows.length - 1].at : null,
  });
};
