import express from "express";

const router = express.Router();

// Logout route
router.post("/logout", (req, res) => {
  // If using sessions:
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out successfully" });
    });
  } else {
    // If using JWT, instruct client to delete token
    return res.json({ message: "Logged out successfully" });
  }
});

export default router;
