import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Mirror of the candidate backend's Offer model (same collection).
const OfferSchema = new Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    domain: { type: String, required: true, enum: ["tech", "design", "management"] },
    status: { type: String, enum: ["pending", "accepted", "declined", "revoked"], default: "pending" },
    sentAt: { type: Date, default: Date.now },
    respondedAt: { type: Date, default: null },
    onboarding: {
      github: {
        status: { type: String, default: "not-started" },
        detail: { type: String, default: "" },
        at: { type: Date, default: null },
      },
    },
  },
  { timestamps: true }
);
OfferSchema.index({ user_id: 1, domain: 1 }, { unique: true });

export default mongoose.models.Offer || mongoose.model("Offer", OfferSchema);
