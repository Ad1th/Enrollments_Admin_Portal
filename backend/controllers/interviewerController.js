import mongoose from "mongoose";
import Interviewer from "../models/Interviewer.js";
import PanelAssignment from "../models/PanelAssignment.js";

const DOMAINS = ["tech", "design", "management"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (body) => {
  const out = {};
  if (body.name !== undefined) out.name = String(body.name).trim().slice(0, 100);
  if (body.email !== undefined) out.email = String(body.email).trim().toLowerCase();
  if (body.domains !== undefined) out.domains = [].concat(body.domains).filter((d) => DOMAINS.includes(d));
  if (body.subdomains !== undefined) out.subdomains = [].concat(body.subdomains).map(String).filter(Boolean).slice(0, 20);
  if (body.active !== undefined) out.active = Boolean(body.active);
  if (body.maxPerDay !== undefined) out.maxPerDay = Math.max(1, Math.min(50, Number(body.maxPerDay) || 8));
  if (body.unavailable !== undefined) {
    out.unavailable = [].concat(body.unavailable)
      .map((u) => ({ start: new Date(u.start), end: new Date(u.end) }))
      .filter((u) => !Number.isNaN(+u.start) && !Number.isNaN(+u.end) && u.end > u.start);
  }
  return out;
};

// Everyone with their load: total interviews assigned and how many are upcoming.
export const listInterviewers = async (req, res) => {
  const [interviewers, loads] = await Promise.all([
    Interviewer.find({}).sort({ active: -1, name: 1 }).lean(),
    PanelAssignment.aggregate([
      {
        $group: {
          _id: "$email",
          total: { $sum: 1 },
          upcoming: { $sum: { $cond: [{ $gt: ["$startTime", new Date()] }, 1, 0] } },
        },
      },
    ]),
  ]);
  const byEmail = new Map(loads.map((l) => [l._id, l]));
  res.json({
    success: true,
    data: interviewers.map((i) => ({ ...i, load: byEmail.get(i.email) || { total: 0, upcoming: 0 } })),
  });
};

export const createInterviewer = async (req, res) => {
  const fields = clean(req.body || {});
  if (!fields.name || !EMAIL_RE.test(fields.email || "")) {
    return res.status(400).json({ message: "Name and a valid email are required" });
  }
  try {
    const created = await Interviewer.create(fields);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "That email is already an interviewer" });
    res.status(500).json({ message: "Could not add interviewer" });
  }
};

export const updateInterviewer = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
  const fields = clean(req.body || {});
  if (fields.email !== undefined && !EMAIL_RE.test(fields.email)) return res.status(400).json({ message: "Invalid email" });
  const updated = await Interviewer.findByIdAndUpdate(req.params.id, { $set: fields }, { new: true }).lean();
  if (!updated) return res.status(404).json({ message: "Not found" });
  res.json({ success: true, data: updated });
};

// People with upcoming interviews are deactivated rather than deleted so
// their panels stay intact.
export const deleteInterviewer = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
  const interviewer = await Interviewer.findById(req.params.id);
  if (!interviewer) return res.status(404).json({ message: "Not found" });
  const upcoming = await PanelAssignment.countDocuments({ email: interviewer.email, startTime: { $gt: new Date() } });
  if (upcoming > 0) {
    interviewer.active = false;
    await interviewer.save();
    return res.json({ success: true, deactivated: true, message: `Deactivated: still on ${upcoming} upcoming panel(s)` });
  }
  await interviewer.deleteOne();
  res.json({ success: true, deleted: true });
};

// Paste "Name, email, tech design, frontend ml" lines (domains and expertise
// optional, space or | separated).
export const importInterviewers = async (req, res) => {
  const lines = String(req.body?.text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const result = { added: 0, updated: 0, skipped: [] };
  for (const line of lines.slice(0, 500)) {
    const [name, email, domains = "", subdomains = ""] = line.split(",").map((p) => p.trim());
    if (!name || !EMAIL_RE.test(email || "")) {
      result.skipped.push(line);
      continue;
    }
    const split = (s) => s.split(/[\s|]+/).map((x) => x.toLowerCase()).filter(Boolean);
    const doc = clean({ name, email, domains: split(domains), subdomains: split(subdomains) });
    const existed = await Interviewer.exists({ email: doc.email });
    await Interviewer.updateOne({ email: doc.email }, { $set: doc }, { upsert: true });
    existed ? result.updated++ : result.added++;
  }
  res.json({ success: true, data: result });
};
