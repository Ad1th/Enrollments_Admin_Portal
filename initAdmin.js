import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

// Load env from current directory
dotenv.config();

const createAdmin = async () => {
  try {
    if (!process.env.CONNECT_STRING) {
      console.error("CONNECT_STRING not found in .env");
      process.exit(1);
    }

    await mongoose.connect(process.env.CONNECT_STRING);
    console.log("Connected to DB");

    // Define minimal Schema to match existing User collection
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model("User", UserSchema);

    const email = "admin@mfc.com";
    const password = "password123";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if exists
    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Updating existing admin user...");
      await User.updateOne(
        { email },
        { 
          $set: { 
            password: hashedPassword, 
            admin: true, 
            verified: true,
            username: "MFC Admin"
          } 
        }
      );
    } else {
      console.log("Creating new admin user...");
      await User.create({
        username: "MFC Admin",
        email,
        password: hashedPassword,
        admin: true,
        verified: true,
        regno: "ADMIN001",
        isProfileDone: true,
        tech: 0,
        design: 0,
        management: 0
      });
    }

    console.log("-----------------------------------------");
    console.log("ADMIN CREATED / UPDATED SUCCESSFULLY");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("-----------------------------------------");

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
};

createAdmin();
