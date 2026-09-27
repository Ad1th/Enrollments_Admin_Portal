import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Mirror of the candidate backend's Submission model (same collection).
const SubmissionSchema = new Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    domain: { type: String, required: true, enum: ["tech", "design", "management"] },
    subdomain: { type: [String], default: [] },
    answers: { type: Map, of: String, default: {} },
    isDone: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Submission || mongoose.model("Submission", SubmissionSchema);
