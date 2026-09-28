import mongoose from "mongoose";
const Schema = mongoose.Schema;

// A reviewer's 1-5 score for a candidate in a domain. One per reviewer, so
// several people can score the same candidate and the portal shows the mean.
const ReviewSchema = new Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    domain: { type: String, required: true, enum: ["tech", "design", "management"] },
    reviewer: { type: String, required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

ReviewSchema.index({ user_id: 1, domain: 1, reviewer: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
