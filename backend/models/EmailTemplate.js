import mongoose from "mongoose";
const Schema = mongoose.Schema;

// Reusable mail body with {{placeholders}} (see services/mailer.js).
const EmailTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.EmailTemplate || mongoose.model("EmailTemplate", EmailTemplateSchema);
