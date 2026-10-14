import mongoose from "mongoose";
const Schema = mongoose.Schema;

// One row per admin-portal request or login attempt. Readable only by the owner.
const AuditLogSchema = new Schema(
  {
    at: { type: Date, default: Date.now, index: true },
    // "admin" for this portal; the candidate backend writes "candidate".
    source: { type: String, default: "admin", index: true },
    kind: { type: String, enum: ["login", "read", "write"], required: true, index: true },
    actorId: { type: String, default: null },
    actorEmail: { type: String, default: null, index: true },
    role: { type: String, default: null },
    method: { type: String },
    path: { type: String },
    status: { type: Number },
    ip: { type: String },
    userAgent: { type: String },
    // Request body with secrets stripped and long values cut; writes only.
    body: { type: Schema.Types.Mixed, default: null },
    note: { type: String, default: "" },
    // Set only on candidate rows so they expire; admin rows are kept.
    expireAt: { type: Date, default: undefined },
  },
  { versionKey: false }
);

AuditLogSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AuditLog", AuditLogSchema);
