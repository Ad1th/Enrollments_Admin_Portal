import mongoose from "mongoose";
const Schema = mongoose.Schema;

const TechTaskSchema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    subdomain: {
      type: [String],
      required: true,
    },
    question1: { type: [String] },
    question2: { type: [String] },
    question3: { type: [String] },
    question4: { type: [String] },
    question5: { type: [String] },
    isDone: { type: Boolean },
  },
  { timestamps: true }
);

export default mongoose.model("TechTask", TechTaskSchema);
