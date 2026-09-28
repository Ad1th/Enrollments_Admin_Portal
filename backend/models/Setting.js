import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Mirror of the candidate backend's Setting model (same collection).
const SettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
