import mongoose from "mongoose";
import User from "../models/User.js";
import Submission from "../models/Submission.js";
import StatusEvent from "../models/StatusEvent.js";

const DOMAINS = ["tech", "design", "management"];
const ROUNDS = [-1, 0, 1, 2, 3];

// Candidates joined with their submissions and meeting. Submissions are split
// into techTasks/designTasks/managementTasks arrays because that is the shape
// the dashboard filters on.
const candidatesPipeline = (match) => [
  { $match: match },
  { $sort: { createdAt: -1 } },
  {
    $lookup: {
      from: "submissions",
      localField: "_id",
      foreignField: "user_id",
      as: "submissions",
    },
  },
  {
    $lookup: {
      from: "meetdetails",
      localField: "_id",
      foreignField: "user_id",
      as: "meetDetails",
    },
  },
  {
    $project: {
      password: 0,
      refreshToken: 0,
      prevAccessToken: 0,
      emailToken: 0,
      emailTokenExpires: 0,
      googleRefreshToken: 0,
      tokenVersion: 0,
      "github.token": 0,
    },
  },
  {
    $addFields: {
      ...Object.fromEntries(
        DOMAINS.map((d) => [
          `${d}Tasks`,
          { $filter: { input: "$submissions", cond: { $eq: ["$$this.domain", d] } } },
        ])
      ),
      meetingTime: { $arrayElemAt: ["$meetDetails.scheduledTime", 0] },
      meetStatus: { $arrayElemAt: ["$meetDetails.status", 0] },
      interviewers: { $arrayElemAt: ["$meetDetails.intervieweremail", 0] },
      hasSubmitted: { $anyElementTrue: [{ $map: { input: "$submissions", in: "$$this.isDone" } }] },
    },
  },
  { $project: { submissions: 0, meetDetails: 0 } },
];

const listCandidates = (forcedDomain) => async (req, res) => {
  try {
    const domain = forcedDomain || (req.query.domain !== "All" && req.query.domain);
    const match = { admin: { $ne: true } };
    if (domain) match.domain = domain;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 5000, 5000);

    const users = await User.aggregate([
      ...candidatesPipeline(match),
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

export const getAllUsers = listCandidates(null);
export const getTechUsers = listCandidates("tech");
export const getDesignUsers = listCandidates("design");
export const getManagementUsers = listCandidates("management");

// Per domain and subdomain: which users submitted and which only have a draft.
export const getSubdomainSubmissionStatus = async (req, res) => {
  try {
    const rows = await Submission.aggregate([
      { $unwind: { path: "$subdomain", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { domain: "$domain", subdomain: { $ifNull: ["$subdomain", "unspecified"] } },
          submitted: { $push: { $cond: ["$isDone", "$user_id", "$$REMOVE"] } },
          notSubmitted: { $push: { $cond: ["$isDone", "$$REMOVE", "$user_id"] } },
        },
      },
    ]);
    const result = { success: true, tech: {}, design: {}, management: {} };
    for (const r of rows) {
      result[r._id.domain][r._id.subdomain] = {
        submitted: r.submitted,
        notSubmitted: r.notSubmitted,
      };
    }
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error segregating submissions" });
  }
};

// Updates rounds and/or notes; every round change is logged in StatusEvent.
export const updateUserStatus = async (req, res) => {
  try {
    const { regno, adminNotes, note } = req.body;
    if (!regno) return res.status(400).json({ message: "RegNo required" });

    const user = await User.findOne({ regno });
    if (!user) return res.status(404).json({ message: "User not found" });

    const events = [];
    for (const domain of DOMAINS) {
      if (req.body[domain] === undefined) continue;
      const next = Number(req.body[domain]);
      if (!ROUNDS.includes(next)) {
        return res.status(400).json({ message: `${domain} must be between -1 and 3` });
      }
      if ((user[domain] ?? 0) === next) continue;
      events.push({
        user_id: user._id,
        domain,
        from: user[domain] ?? 0,
        to: next,
        actor: req.user?.email || "admin",
        note: note || "",
      });
      user[domain] = next;
    }
    if (adminNotes !== undefined) user.adminNotes = adminNotes;

    await user.save();
    const saved = events.length ? await StatusEvent.insertMany(events) : [];

    res.status(200).json({ success: true, message: "Status updated", user, events: saved });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating status" });
  }
};

export const getUserHistory = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const events = await StatusEvent.find({ user_id: req.params.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
};
