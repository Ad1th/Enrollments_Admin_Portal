import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  try {
    const secret = process.env.ACCESS_TOKEN_SECERT;
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
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
      { id: user._id, email: user.email, admin: user.admin },
      secret,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        admin: user.admin
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
