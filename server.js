import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import generateLine from "./routes/generateLine.js";
import generateVoice from "./routes/generateVoice.js";
import processSpeech from "./routes/processSpeech.js";
import generateReflection from "./routes/generateReflection.js"; // 🎭 NEW: Mission 2 Reflection System

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("✅ Motivator.AI backend is alive! 🎭 Mission 2: Reflection System Online!");
});

// 🚀 Mission 1: AI Dictaphone (COMPLETED ✅)
app.use("/generate-line", generateLine);
app.use("/generate-voice", generateVoice);
app.use("/process-speech", processSpeech);

// 🎭 Mission 2: Smart AI Reflection System (NEW 🚀)
app.use("/generate-reflection", generateReflection);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is now actively listening on http://0.0.0.0:${PORT}`);
  console.log(`🎭 Mission 2: Smart AI Reflection System - READY!`);
});

app.get("/test", (req, res) => {
  res.send("🧪 Test endpoint reached successfully - Mission 2 Ready!");
});

console.log("🧪 End of server.js reached");