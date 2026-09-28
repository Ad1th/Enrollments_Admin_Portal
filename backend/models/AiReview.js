import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Cached AI assessment of one candidate's submission in one domain. A new
// review is only generated when the answers change or an admin forces it.
const AiReviewSchema = new Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    domain: { type: String, required: true, enum: ["tech", "design", "management"] },
    model: { type: String, required: true },
    // Hash of the answers reviewed, to spot stale reviews.
    answersHash: { type: String, required: true },
    overall: { type: Number, min: 1, max: 10 },
    confidence: { type: String, enum: ["low", "medium", "high"], default: "low" },
    summary: { type: String, default: "" },
    strengths: { type: [String], default: [] },
    concerns: { type: [String], default: [] },
    flags: { type: [String], default: [] },
    perQuestion: {
      type: [{ key: String, score: Number, reason: String }],
      default: [],
    },
    requestedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

AiReviewSchema.index({ user_id: 1, domain: 1 }, { unique: true });

export default mongoose.models.AiReview || mongoose.model("AiReview", AiReviewSchema);
