import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Mirror of the candidate backend's Question model (same collection).
const QuestionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    domain: { type: String, required: true, enum: ["tech", "design", "management"] },
    subdomain: { type: String, default: null },
    subdomainLabel: { type: String, default: null },
    audience: { type: String, enum: ["all", "junior", "senior"], default: "all" },
    kind: { type: String, enum: ["long", "portfolio"], default: "long" },
    prompt: { type: String, required: true },
    helper: { type: String, default: "" },
    order: { type: Number, default: 0 },
    maxWords: { type: Number, default: 2000 },
    rubric: { type: String, default: "" },
    active: { type: Boolean, default: true },
    legacyField: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Question || mongoose.model("Question", QuestionSchema);
