import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { writeAudit, clientIp } from "../middleware/audit.js";

export const login = async (req, res) => {
  try {
    const secret = process.env.ACCESS_TOKEN_SECERT || process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "Server misconfigured" });
    }

    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    const user = await User.findOne({ email });
    const isValid = user && user.password && (await bcrypt.compare(password, user.password));

    // Same answer for "no such user", "wrong password" and "not an admin", so
    // the login form can't be used to discover which emails exist.
    if (!isValid || !user.admin) {
      await writeAudit({
        source: "admin", kind: "login", actorId: user ? String(user._id) : null, actorEmail: email, role: user?.role || null,
        method: "POST", path: "/auth/login", status: 401, ip: clientIp(req),
        userAgent: String(req.headers["user-agent"] || "").slice(0, 200), note: "failed login",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const role = user.role || "full";

    const accessToken = jwt.sign(
      { id: user._id, email: user.email, admin: user.admin, role },
      secret,
      { expiresIn: "1d" }
    );

    await writeAudit({
      source: "admin", kind: "login", actorId: String(user._id), actorEmail: user.email, role,
      method: "POST", path: "/auth/login", status: 200, ip: clientIp(req),
      userAgent: String(req.headers["user-agent"] || "").slice(0, 200), note: "login",
    });

    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        admin: user.admin,
        role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
