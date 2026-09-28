import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Mirror of the candidate backend's Interviewer model (same collection).
const InterviewerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    domains: { type: [String], enum: ["tech", "design", "management"], default: [] },
    subdomains: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    maxPerDay: { type: Number, default: 8, min: 1 },
    unavailable: { type: [{ start: Date, end: Date }], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Interviewer || mongoose.model("Interviewer", InterviewerSchema);
