import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Cached GitHub repo analysis, keyed by "owner/repo" (lowercase).
const RepoReportSchema = new Schema(
  {
    repo: { type: String, required: true, unique: true },
    report: { type: Schema.Types.Mixed, required: true },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.models.RepoReport || mongoose.model("RepoReport", RepoReportSchema);
