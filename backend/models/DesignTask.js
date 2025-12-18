import mongoose from "mongoose";
const Schema = mongoose.Schema;

const DesignTaskSchema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    subdomain: { type: [String] },
    question1: { type: [String] },
    question2: { type: [String] },
    question3: { type: [String] },
    question4: { type: [String] },
    question5: { type: [String] },
    question6: { type: [String] },
    question7: { type: [String] },
    question8: { type: [String] },
    question9: { type: [String] },
    question10: { type: [String] },
    question11: { type: [String] },
    question12: { type: [String] },
    question13: { type: [String] },
    isDone: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("DesignTask", DesignTaskSchema);
