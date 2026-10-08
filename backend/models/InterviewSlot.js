import mongoose from "mongoose";
const Schema = mongoose.Schema;

const InterviewSlotSchema = new Schema(
  {
    date: {
      type: String,
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
    },
    domains: {
      type: [String],
      enum: ["tech", "design", "management"],
      default: ["tech", "design", "management"],
    },
    maxCapacity: {
      type: Number,
      default: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.InterviewSlot || mongoose.model("InterviewSlot", InterviewSlotSchema);
