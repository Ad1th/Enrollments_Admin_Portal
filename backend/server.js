import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

// Load env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003; // Uses PORT from .env or defaults to 5003

// Add Global Middleware (Crucial for CORS and JSON)
app.use(cors());
app.set("trust proxy", 1);
app.use(express.json({ limit: "1mb" }));

// DB Connection Logic for Serverless
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;

  console.log("Starting new DB connection...");
  return mongoose.connect(process.env.CONNECT_STRING);
};

// Middleware to ensure DB is connected before any route logic
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection failed:", err);
    res.status(500).json({ message: "Database connection error" });
  }
});

// Debug Log (Masked)
console.log(
  "Connect String loaded:",
  process.env.CONNECT_STRING ? "Yes (Masked)" : "No",
);

// Root Route for Health Check
app.get("/", (req, res) => {
  res.send("MFC Recruitment Admin Portal Backend is Running");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is healthy",
    db: mongoose.connection.readyState,
  });
});

// Auth
import { verifyAdmin } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";

// Routes
import { login } from "./controllers/authController.js";
import {
  getAllUsers,
  updateUserStatus,
  getTechUsers,
  getDesignUsers,
  getManagementUsers,
  getSubdomainSubmissionStatus,
  getUserHistory,
} from "./controllers/adminController.js";
import { listQuestions, createQuestion, updateQuestion, deleteQuestion } from "./controllers/questionController.js";
import { runAiReview, listAiReviews } from "./controllers/aiReviewController.js";
import { getSimilarity } from "./controllers/similarityController.js";
import { saveReview, listReviews } from "./controllers/reviewController.js";
import { getRepoReport } from "./controllers/repoController.js";
import {
  listInterviewers,
  createInterviewer,
  updateInterviewer,
  deleteInterviewer,
  importInterviewers,
} from "./controllers/interviewerController.js";
import {
  listMeetings,
  updateMeeting,
  getInterviewSlots,
  createInterviewSlots,
  deleteInterviewSlot,
  scheduleInterview,
} from "./controllers/meetingController.js";
import { getOnboarding, saveOnboarding, listOffers } from "./controllers/settingsController.js";
import {
  previewAudience,
  listTemplates,
  saveTemplate,
  deleteTemplate,
  createCampaign,
  sendBatch,
  retryFailed,
  listCampaigns,
  trackOpen,
} from "./controllers/commsController.js";
import { getStats } from "./controllers/statsController.js";
import { schedulePanels } from "./controllers/schedulerController.js";

// Open-tracking pixel for comms mails; public by nature, only ever sets openedAt.
app.get("/t/:id", trackOpen);

// Auth Routes
// Best effort on serverless (each instance keeps its own counter), but it still
// turns a password spray into a slow crawl.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => String(req.body?.email || req.ip).toLowerCase(),
  message: { message: "Too many login attempts, try again later." },
});
authRouter.post("/login", loginLimiter, login);
app.use("/auth", authRouter);

// Admin Routes (Protected)
const adminRouter = express.Router();
adminRouter.use(verifyAdmin);

adminRouter.get("/users/:id", getAllUsers);
adminRouter.get("/userstech/:id", getTechUsers);
adminRouter.get("/usersdesign/:id", getDesignUsers);
adminRouter.get("/usersmanagement/:id", getManagementUsers);
adminRouter.put("/updatestatus/update", updateUserStatus);
adminRouter.get("/subdomain-status", getSubdomainSubmissionStatus);
adminRouter.get("/history/:userId", getUserHistory);
adminRouter.get("/questions", listQuestions);
adminRouter.post("/questions", createQuestion);
adminRouter.patch("/questions/:key", updateQuestion);
adminRouter.delete("/questions/:key", deleteQuestion);
adminRouter.post("/ai-review", runAiReview);
adminRouter.get("/ai-review", listAiReviews);
adminRouter.get("/similarity", getSimilarity);
adminRouter.put("/reviews", saveReview);
adminRouter.get("/reviews", listReviews);
adminRouter.get("/repo-report", getRepoReport);
adminRouter.get("/interviewers", listInterviewers);
adminRouter.post("/interviewers", createInterviewer);
adminRouter.post("/interviewers/import", importInterviewers);
adminRouter.patch("/interviewers/:id", updateInterviewer);
adminRouter.delete("/interviewers/:id", deleteInterviewer);
adminRouter.get("/meetings", listMeetings);
adminRouter.patch("/meetings/:id", updateMeeting);
adminRouter.post("/meetings/schedule", scheduleInterview);
adminRouter.get("/interview-slots", getInterviewSlots);
adminRouter.post("/interview-slots", createInterviewSlots);
adminRouter.delete("/interview-slots/:id", deleteInterviewSlot);
adminRouter.get("/settings/onboarding", getOnboarding);
adminRouter.put("/settings/onboarding", saveOnboarding);
adminRouter.get("/offers", listOffers);
adminRouter.post("/comms/audience", previewAudience);
adminRouter.get("/comms/templates", listTemplates);
adminRouter.post("/comms/templates", saveTemplate);
adminRouter.delete("/comms/templates/:id", deleteTemplate);
adminRouter.get("/comms/campaigns", listCampaigns);
adminRouter.post("/comms/campaigns", createCampaign);
adminRouter.post("/comms/campaigns/:id/send", sendBatch);
adminRouter.post("/comms/campaigns/:id/retry", retryFailed);
adminRouter.get("/stats", getStats);
adminRouter.post("/schedule-panels", schedulePanels);

app.use("/admin", adminRouter);

// Vercel imports the app; locally `npm start` runs it as a server.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Admin backend on http://localhost:${PORT}`));
}

// Global error handler — catches any unhandled throw from route handlers
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

export default app;
