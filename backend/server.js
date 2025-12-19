import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Load env
dotenv.config();

const app = express();
const PORT = 5003; // Independent port as planned

// Middleware
app.use(cors());
app.use(express.json());

// Auth
import { verifyAdmin } from "./middleware/auth.js";

// Routes
import { login } from "./controllers/authController.js";
import { getAllUsers, updateUserStatus, getTechUsers, getDesignUsers, getManagementUsers } from "./controllers/adminController.js";

// Auth Routes
const authRouter = express.Router();
authRouter.post("/login", login);
app.use("/auth", authRouter);

// Admin Routes (Protected)
const adminRouter = express.Router();
adminRouter.use(verifyAdmin); // Apply middleware to all routes in this router

adminRouter.get("/users/:id", getAllUsers); 
adminRouter.get("/userstech/:id", getTechUsers);
adminRouter.get("/usersdesign/:id", getDesignUsers);
adminRouter.get("/usersmanagement/:id", getManagementUsers);
adminRouter.put("/updatestatus/update", updateUserStatus);

app.use("/admin", adminRouter);

// DB Connection - Only connect and listen if not on Vercel or if called directly
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  mongoose.connect(process.env.CONNECT_STRING)
    .then(() => {
      console.log("Connected to MongoDB");
      app.listen(PORT, () => {
        console.log(`Backend Server running on port ${PORT}`);
      });
    })
    .catch(err => console.error("DB Connection Error:", err));
} else {
  // On Vercel, the connection should ideally be handled at the start of the request if not already connected
  // However, for simplicity in Express, we can call it here, but it might be better handled in middleware or at the top level
  mongoose.connect(process.env.CONNECT_STRING)
    .catch(err => console.error("DB Connection Error:", err));
}

export default app;
