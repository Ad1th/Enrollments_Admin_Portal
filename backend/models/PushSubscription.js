import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Mirror of the candidate backend's PushSubscription model (same collection).
const PushSubscriptionSchema = new Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: { p256dh: String, auth: String },
  },
  { timestamps: true }
);

export default mongoose.models.PushSubscription || mongoose.model("PushSubscription", PushSubscriptionSchema);
