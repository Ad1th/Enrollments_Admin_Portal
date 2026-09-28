import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

// Load env
dotenv.config();

const app = express();
const PORT = 5003; // Independent port as planned

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
import { listQuestions, updateQuestion } from "./controllers/questionController.js";
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
import { listMeetings, updateMeeting } from "./controllers/meetingController.js";

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
adminRouter.patch("/questions/:key", updateQuestion);
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

app.use("/admin", adminRouter);

// Vercel imports the app; locally `npm start` runs it as a server.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Admin backend on http://localhost:${PORT}`));
}

export default app;
