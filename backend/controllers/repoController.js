import mongoose from "mongoose";
import RepoReport from "../models/RepoReport.js";
import Submission from "../models/Submission.js";
import User from "../models/User.js";
import { analyseRepo, parseRepo, signalsFor } from "../services/repoAnalysis.js";

const TTL_MS = 6 * 60 * 60 * 1000;

// GET /admin/repo-report?url=<github url>&userId=<candidate>
export const getRepoReport = async (req, res) => {
  const fullName = parseRepo(req.query.url);
  if (!fullName) return res.status(400).json({ message: "Not a GitHub repository URL" });

  try {
    let cached = await RepoReport.findOne({ repo: fullName }).lean();
    if (!cached || Date.now() - new Date(cached.fetchedAt).getTime() > TTL_MS || req.query.refresh) {
      const report = await analyseRepo(fullName);
      cached = await RepoReport.findOneAndUpdate(
        { repo: fullName },
        { $set: { report, fetchedAt: new Date() } },
        { upsert: true, new: true }
      ).lean();
    }

    let context = {};
    if (mongoose.isValidObjectId(req.query.userId)) {
      const [user, submission] = await Promise.all([
        User.findById(req.query.userId).select("github").lean(),
        Submission.findOne({ user_id: req.query.userId, isDone: true }).sort({ submittedAt: -1 }).select("submittedAt").lean(),
      ]);
      context = { githubLogin: user?.github?.login, submittedAt: submission?.submittedAt };
    }

    res.json({
      success: true,
      data: { ...cached.report, fetchedAt: cached.fetchedAt, signals: signalsFor(cached.report, context) },
    });
  } catch (error) {
    console.error("repo report failed:", error.message);
    res.status(502).json({ message: "Could not analyse this repository" });
  }
};
