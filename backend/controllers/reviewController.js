import mongoose from "mongoose";
import Review from "../models/Review.js";

// PUT { userId, domain, score (1-5, or null to clear), note }
export const saveReview = async (req, res) => {
  const { userId, domain, score, note } = req.body || {};
  if (!mongoose.isValidObjectId(userId) || !["tech", "design", "management"].includes(domain)) {
    return res.status(400).json({ message: "userId and domain are required" });
  }
  const reviewer = req.user.email;
  if (score === null) {
    await Review.deleteOne({ user_id: userId, domain, reviewer });
    return res.json({ success: true, data: null });
  }
  const n = Number(score);
  if (!Number.isInteger(n) || n < 1 || n > 5) return res.status(400).json({ message: "score must be 1-5" });

  const review = await Review.findOneAndUpdate(
    { user_id: userId, domain, reviewer },
    { $set: { score: n, ...(note !== undefined ? { note: String(note).slice(0, 1000) } : {}) } },
    { upsert: true, new: true }
  ).lean();
  res.json({ success: true, data: review });
};

// GET ?userId= -> every reviewer's score for that candidate.
// GET (no userId) -> per candidate/domain mean and count, for list columns.
export const listReviews = async (req, res) => {
  if (req.query.userId) {
    if (!mongoose.isValidObjectId(req.query.userId)) return res.status(400).json({ message: "Invalid userId" });
    const reviews = await Review.find({ user_id: req.query.userId }).sort({ updatedAt: -1 }).lean();
    return res.json({ success: true, data: reviews });
  }
  const summary = await Review.aggregate([
    { $group: { _id: { user_id: "$user_id", domain: "$domain" }, mean: { $avg: "$score" }, count: { $sum: 1 } } },
  ]);
  res.json({
    success: true,
    data: summary.map((s) => ({ user_id: s._id.user_id, domain: s._id.domain, mean: +s.mean.toFixed(2), count: s.count })),
  });
};
