import mongoose from "mongoose";
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    regno: { type: String, trim: true },
    password: { type: String },
    verified: { type: Boolean, required: true, default: false },
    tech: { type: Number, required: true, default: 0 },
    design: { type: Number, required: true, default: 0 },
    management: { type: Number, required: true, default: 0 },
    isCore: { type: Boolean, required: true, default: false },
    mobile: { type: Number },
    emailpersonal: { type: String, trim: true, lowercase: true },
    domain: { type: [String], enum: ["tech", "design", "management"], default: [] },
    admin: { type: Boolean, default: false },
    isProfileDone: { type: Boolean, required: true, default: false },
    isJC: { type: Boolean },
    isSC: { type: Boolean },
    adminNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
