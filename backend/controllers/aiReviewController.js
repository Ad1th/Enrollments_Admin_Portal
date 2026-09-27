import mongoose from "mongoose";
import AiReview from "../models/AiReview.js";
import Submission from "../models/Submission.js";
import Question from "../models/Question.js";
import User from "../models/User.js";
import { llmConfigured } from "../services/llm.js";
import { reviewSubmission, hashAnswers } from "../services/aiReviewer.js";

// POST { userId, domain, force } -> cached review unless the answers changed.
export const runAiReview = async (req, res) => {
  const { userId, domain, force } = req.body || {};
  if (!mongoose.isValidObjectId(userId) || !["tech", "design", "management"].includes(domain)) {
    return res.status(400).json({ message: "userId and domain are required" });
  }
  if (!llmConfigured()) {
    return res.status(503).json({ message: "Set LLM_API_KEY (Groq/xAI/OpenRouter) to enable AI review" });
  }

  try {
    const submission = await Submission.findOne({ user_id: userId, domain }).lean();
    const answers = submission?.answers || {};
    if (Object.keys(answers).length === 0) {
      return res.status(404).json({ message: "Nothing submitted in this domain yet" });
    }

    const existing = await AiReview.findOne({ user_id: userId, domain }).lean();
    if (existing && !force && existing.answersHash === hashAnswers(answers)) {
      return res.json({ success: true, data: existing, cached: true });
    }

    const user = await User.findById(userId).select("isSC").lean();
    const audience = user?.isSC ? "senior" : "junior";
    const questions = await Question.find({ domain, audience: { $in: ["all", audience] } })
      .sort({ order: 1 })
      .lean();

    const review = await reviewSubmission({
      domain,
      subdomains: submission.subdomain || [],
      questions,
      answers,
    });
    const saved = await AiReview.findOneAndUpdate(
      { user_id: userId, domain },
      { $set: { ...review, requestedBy: req.user?.email || "" } },
      { upsert: true, new: true }
    ).lean();
    res.json({ success: true, data: saved, cached: false });
  } catch (error) {
    console.error("AI review failed:", error.message);
    const status = error.status === 429 ? 429 : 502;
    res.status(status).json({
      message: status === 429 ? "The LLM provider is rate limiting, slow down a bit" : `AI review failed: ${error.message}`,
    });
  }
};

// GET ?userId= (one candidate) or all reviews, for list badges.
export const listAiReviews = async (req, res) => {
  const filter = {};
  if (req.query.userId) {
    if (!mongoose.isValidObjectId(req.query.userId)) return res.status(400).json({ message: "Invalid userId" });
    filter.user_id = req.query.userId;
  }
  if (req.query.domain) filter.domain = req.query.domain;
  const reviews = await AiReview.find(filter)
    .select(req.query.userId ? "" : "user_id domain overall confidence flags")
    .lean();
  res.json({ success: true, data: reviews, enabled: llmConfigured() });
};
