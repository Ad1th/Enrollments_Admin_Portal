import mongoose from "mongoose";
const Schema = mongoose.Schema;

const MeetSchema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    intervieweremail: {
      type: [String],
      default: [],
    },
    domains: { type: [String], default: [] },
    panelIncomplete: { type: Boolean, default: false },
    reminderSentAt: { type: Date, default: null },
    rescheduleCount: { type: Number, default: 0 },
    scheduledTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    gmeetLink: {
      type: String,
    },
    googleEventId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["scheduled", "underway", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

export default mongoose.model("MeetDetails", MeetSchema);
