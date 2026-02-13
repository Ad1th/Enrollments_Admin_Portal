import express from "express";
import {
  getSubdomainSubmissionStatus,
  getAllUsers,
  getTechUsers,
  getDesignUsers,
  getManagementUsers,
  updateUserStatus,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/subdomain-status", getSubdomainSubmissionStatus);
router.get("/users", getAllUsers);
router.get("/userstech", getTechUsers);
router.get("/usersdesign", getDesignUsers);
router.get("/usersmanagement", getManagementUsers);
router.put("/updatestatus", updateUserStatus);

export default router;
