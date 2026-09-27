import jwt from "jsonwebtoken";
import User from "../models/User.js";

// The admin flag is re-read from the database on every request so revoking
// someone's admin rights takes effect immediately, not when their token expires.
export const verifyAdmin = async (req, res, next) => {
  const secret = process.env.ACCESS_TOKEN_SECERT;
  if (!secret) {
    return res.status(500).json({ message: "Server misconfigured" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(decoded.id).select("admin email username");
    if (!user || user.admin !== true) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    req.user = { id: String(user._id), email: user.email, username: user.username, admin: true };
    next();
  } catch (error) {
    return res.status(500).json({ message: "Could not verify admin" });
  }
};
