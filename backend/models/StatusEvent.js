import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Mirror of the candidate backend's StatusEvent model (same collection).
const StatusEventSchema = new Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    domain: { type: String, required: true, enum: ["tech", "design", "management"] },
    from: { type: Number, required: true },
    to: { type: Number, required: true },
    actor: { type: String, default: "system" },
    note: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.StatusEvent || mongoose.model("StatusEvent", StatusEventSchema);
