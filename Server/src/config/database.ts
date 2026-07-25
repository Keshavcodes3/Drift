import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async (): Promise<void> => {
    try {
        const connection = await mongoose.connect(env.MONGODB_URI);

        console.log(`🍃 MongoDB Connected: ${connection.connection.host}`);
    } catch (error) {
        console.error("❌ Database Connection Failed");

        if (error instanceof Error) {
            console.error(error.message);
        }

        process.exit(1);
    }
};