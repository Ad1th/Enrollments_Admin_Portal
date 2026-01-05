import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Load env
dotenv.config();

const app = express();
const PORT = 5003; // Independent port as planned

// Add Global Middleware (Crucial for CORS and JSON)
app.use(cors());
app.use(express.json());

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
  process.env.CONNECT_STRING ? "Yes (Masked)" : "No"
);

// Root Route for Health Check
app.get("/", (req, res) => {
  res.send("MFC Recruitment Admin Portal Backend is Running");
});

app.get("/health", (req, res) => {
  res
    .status(200)
    .json({
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
} from "./controllers/adminController.js";

// Auth Routes
authRouter.post("/login", login);
app.use("/auth", authRouter);

// Admin Routes (Protected)
const adminRouter = express.Router();
adminRouter.use(verifyAdmin);

adminRouter.get("/users/:id", getAllUsers);
adminRouter.get("/userstech/:id", getTechUsers);
adminRouter.get("/usersdesign/:id", getDesignUsers);
adminRouter.get("/usersmanagement/:id", getManagementUsers);
adminRouter.put("/updatestatus/update", updateUserStatus);

app.use("/admin", adminRouter);

export default app;
