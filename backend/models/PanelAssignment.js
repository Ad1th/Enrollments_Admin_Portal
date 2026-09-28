import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Mirror of the candidate backend's PanelAssignment model (same collection).
const PanelAssignmentSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    domain: { type: String, default: null },
  },
  { timestamps: true }
);
PanelAssignmentSchema.index({ email: 1, startTime: 1 }, { unique: true });

export default mongoose.models.PanelAssignment || mongoose.model("PanelAssignment", PanelAssignmentSchema);
