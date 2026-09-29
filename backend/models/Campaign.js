import mongoose from "mongoose";
const Schema = mongoose.Schema;

// One bulk send: the exact subject/body used and who it targeted. Per
// recipient delivery and opens live in EmailLog.
const CampaignSchema = new Schema(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    audience: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: String, default: "" },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);
