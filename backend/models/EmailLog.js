import mongoose from "mongoose";
const Schema = mongoose.Schema;

const EmailLogSchema = new Schema(
  {
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: String, required: true },
    status: { type: String, enum: ["queued", "sending", "sent", "failed"], default: "queued" },
    error: { type: String, default: "" },
    sentAt: { type: Date, default: null },
    // Via a tracking pixel; approximate (image blocking, Gmail's proxy prefetch).
    openedAt: { type: Date, default: null },
    opens: { type: Number, default: 0 },
  },
  { timestamps: true }
);
EmailLogSchema.index({ campaign_id: 1, status: 1 });
EmailLogSchema.index({ campaign_id: 1, user_id: 1 }, { unique: true });

export default mongoose.models.EmailLog || mongoose.model("EmailLog", EmailLogSchema);
