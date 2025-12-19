import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./backend/models/User.js";
import Meet from "./backend/models/Meet.js";

dotenv.config();

const seedMeets = async () => {
    try {
        await mongoose.connect(process.env.CONNECT_STRING);
        console.log("Connected to DB");

        const users = await User.find({ admin: false }).limit(5); // Get 5 participants
        
        if (users.length === 0) {
            console.log("No users found to seed meetings for.");
            process.exit();
        }

        console.log(`Seeding meetings for ${users.length} users...`);

        // Clear existing meets for these users
        const userIds = users.map(u => u._id);
        await Meet.deleteMany({ user_id: { $in: userIds } });

        const now = new Date();

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const randomHour = Math.floor(Math.random() * 24);
            const randomDay = Math.floor(Math.random() * 5); // Next 5 days
            
            const startTime = new Date(now);
            startTime.setDate(startTime.getDate() + randomDay);
            startTime.setHours(randomHour, 0, 0, 0);

            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + 1);

            await Meet.create({
                user_id: user._id,
                scheduledTime: startTime,
                endTime: endTime,
                status: "scheduled",
                gmeetLink: "https://meet.google.com/abc-defg-hij"
            });
            console.log(`Created meeting for ${user.username} at ${startTime.toLocaleString()}`);
        }

        console.log("Seeding Complete.");
        await mongoose.disconnect();

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

seedMeets();
