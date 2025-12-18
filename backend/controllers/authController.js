import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    if (!user.admin) {
        // Optional: Block non-admins if this is strictly admin portal
        // return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const accessToken = jwt.sign(
      { id: user._id, email: user.email, admin: user.admin },
      process.env.ACCESS_TOKEN_SECERT || "secret",
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
