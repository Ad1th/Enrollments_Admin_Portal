import mongoose from "mongoose";
import User from "../models/User.js";
import EmailTemplate from "../models/EmailTemplate.js";
import Campaign from "../models/Campaign.js";
import EmailLog from "../models/EmailLog.js";
import Meet from "../models/Meet.js";
import { fillTemplate, renderHtml, sendMail, mailConfigured } from "../services/mailer.js";

const DOMAINS = ["tech", "design", "management"];
// Small batches keep each request well inside Vercel's function timeout; the
// UI keeps calling /send until nothing is left.
const BATCH = 15;

// Audience filter -> candidates. All parts optional:
// { domain, rounds: [-1..3], submitted: bool, meeting: "booked"|"none", offer: "pending"|"accepted"|"declined" }
const findAudience = async (filter = {}) => {
  const match = { admin: { $ne: true }, verified: true };
  const domain = DOMAINS.includes(filter.domain) ? filter.domain : null;
  if (domain) match.domain = domain;
  if (domain && Array.isArray(filter.rounds) && filter.rounds.length) {
    match[domain] = { $in: filter.rounds.map(Number) };
  }

  const pipeline = [{ $match: match }];
  if (filter.submitted !== undefined && filter.submitted !== "") {
    const done = { isDone: true, ...(domain ? { domain } : {}) };
    pipeline.push(
      { $lookup: { from: "submissions", localField: "_id", foreignField: "user_id", as: "subs" } },
      { $match: { subs: filter.submitted ? { $elemMatch: done } : { $not: { $elemMatch: done } } } }
    );
  }
  if (filter.meeting === "booked" || filter.meeting === "none") {
    pipeline.push(
      { $lookup: { from: "meetdetails", localField: "_id", foreignField: "user_id", as: "meets" } },
      { $match: { meets: filter.meeting === "booked" ? { $ne: [] } : { $eq: [] } } }
    );
  }
  if (["pending", "accepted", "declined"].includes(filter.offer)) {
    pipeline.push(
      { $lookup: { from: "offers", localField: "_id", foreignField: "user_id", as: "offers" } },
      { $match: { offers: { $elemMatch: { status: filter.offer, ...(domain ? { domain } : {}) } } } }
    );
  }
  pipeline.push(
    { $lookup: { from: "meetdetails", localField: "_id", foreignField: "user_id", as: "meetingList" } },
    {
      $addFields: {
        meeting: { $arrayElemAt: ["$meetingList", 0] },
      },
    },
    {
      $project: {
        username: 1,
        email: 1,
        regno: 1,
        domain: 1,
        meeting: 1,
      },
    }
  );
  return User.aggregate(pipeline);
};



export const previewAudience = async (req, res) => {
  const users = await findAudience(req.body?.filter);
  const sample = users[0];
  res.json({
    success: true,
    data: {
      count: users.length,
      sample: users.slice(0, 5),
      preview: sample && req.body?.body
        ? { subject: fillTemplate(req.body.subject || "", sample), text: fillTemplate(req.body.body, sample) }
        : null,
      mailConfigured: mailConfigured(),
    },
  });
};

export const listTemplates = async (req, res) => {
  res.json({ success: true, data: await EmailTemplate.find({}).sort({ updatedAt: -1 }).lean() });
};

export const saveTemplate = async (req, res) => {
  const { _id, name, subject, body } = req.body || {};
  if (!name || !subject || !body) return res.status(400).json({ message: "name, subject and body are required" });
  const fields = { name: String(name).slice(0, 100), subject: String(subject).slice(0, 200), body: String(body).slice(0, 20000) };
  const doc =
    _id && mongoose.isValidObjectId(_id)
      ? await EmailTemplate.findByIdAndUpdate(_id, { $set: fields }, { new: true }).lean()
      : await EmailTemplate.create({ ...fields, createdBy: req.user.email });
  res.json({ success: true, data: doc });
};

export const deleteTemplate = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
  await EmailTemplate.deleteOne({ _id: req.params.id });
  res.json({ success: true });
};

// Freezes subject/body and the recipient list; sending happens in batches.
export const createCampaign = async (req, res) => {
  const { name, subject, body, filter } = req.body || {};
  if (!subject || !body) return res.status(400).json({ message: "subject and body are required" });
  const users = await findAudience(filter);
  if (users.length === 0) return res.status(400).json({ message: "No one matches this audience" });

  const campaign = await Campaign.create({
    name: String(name || subject).slice(0, 120),
    subject: String(subject).slice(0, 200),
    body: String(body).slice(0, 20000),
    audience: filter || {},
    createdBy: req.user.email,
    total: users.length,
  });
  await EmailLog.insertMany(
    users.filter((u) => u.email).map((u) => ({ campaign_id: campaign._id, user_id: u._id, to: u.email })),
    { ordered: false }
  );
  res.status(201).json({ success: true, data: campaign });
};

const counts = async (campaignIds) => {
  const rows = await EmailLog.aggregate([
    { $match: { campaign_id: { $in: campaignIds } } },
    {
      $group: {
        _id: "$campaign_id",
        queued: { $sum: { $cond: [{ $in: ["$status", ["queued", "sending"]] }, 1, 0] } },
        sent: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $ne: ["$openedAt", null] }, 1, 0] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
};

// Sends the next batch. Each log is claimed atomically (queued -> sending), so
// two browser tabs pressing send can't mail anyone twice.
export const sendBatch = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
  if (!mailConfigured()) return res.status(503).json({ message: "Set MFC_EMAIL and MFC_EMAIL_PASSWORD to send mail" });
  const campaign = await Campaign.findById(req.params.id).lean();
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const base = `${req.protocol}://${req.get("host")}`;
  let processed = 0;
  for (let i = 0; i < BATCH; i++) {
    const log = await EmailLog.findOneAndUpdate(
      { campaign_id: campaign._id, status: "queued" },
      { $set: { status: "sending" } },
      { new: true }
    );
    if (!log) break;
    processed++;
    const user = await User.findById(log.user_id).select("username regno domain").lean();
    if (user) {
      user.meeting = await Meet.findOne({ user_id: user._id }).lean();
    }
    const text = fillTemplate(campaign.body, user || {});
    try {
      await sendMail({
        to: log.to,
        subject: fillTemplate(campaign.subject, user || {}),
        text,
        html: renderHtml(text, `${base}/t/${log._id}.gif`),
      });

      await EmailLog.updateOne({ _id: log._id }, { $set: { status: "sent", sentAt: new Date(), error: "" } });
    } catch (err) {
      await EmailLog.updateOne({ _id: log._id }, { $set: { status: "failed", error: String(err.message).slice(0, 300) } });
    }
  }
  const c = (await counts([campaign._id])).get(String(campaign._id)) || {};
  res.json({ success: true, data: { processed, remaining: c.queued || 0, sent: c.sent || 0, failed: c.failed || 0 } });
};

// Failed recipients go back in the queue.
export const retryFailed = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id" });
  const r = await EmailLog.updateMany({ campaign_id: req.params.id, status: "failed" }, { $set: { status: "queued" } });
  res.json({ success: true, data: { requeued: r.modifiedCount } });
};

export const listCampaigns = async (req, res) => {
  const campaigns = await Campaign.find({}).sort({ createdAt: -1 }).limit(100).lean();
  const byId = await counts(campaigns.map((c) => c._id));
  res.json({
    success: true,
    data: campaigns.map((c) => ({ ...c, stats: byId.get(String(c._id)) || { queued: 0, sent: 0, failed: 0, opened: 0 } })),
  });
};

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

// Public: the 1x1 image in each mail. Always answers with the pixel.
export const trackOpen = async (req, res) => {
  const id = String(req.params.id || "").replace(/\.gif$/, "");
  if (mongoose.isValidObjectId(id)) {
    await EmailLog.updateOne({ _id: id, openedAt: null }, { $set: { openedAt: new Date() } }).catch(() => {});
    await EmailLog.updateOne({ _id: id }, { $inc: { opens: 1 } }).catch(() => {});
  }
  res.set({ "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" });
  res.end(PIXEL);
};
