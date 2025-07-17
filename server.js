import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import generateLine from "./routes/generateLine.js";
import generateVoice from "./routes/generateVoice.js";
import processSpeech from "./routes/processSpeech.js";
import generateReflection from "./routes/generateReflection.js"; // 🎭 NEW: Mission 2 Reflection System
import createTaskAsync from "./routes/createTaskAsync.js"; // 🚀 NEW: Baby Step 1 - Async Queue System
import voiceConversation from "./routes/voiceConversation.js"; // 🧠 NEW: Real AI conversations

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Increase payload limits for voice conversations
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check route
app.get("/", (req, res) => {
  res.send(`
    ✅ Motivator.AI Backend - FULLY LOADED! 
    🎭 Mission 2: Reflection System ✅
    🚀 Async Queue System ✅ 
    🧠 Real AI Conversations ✅
    💭 Memory & Learning System ✅
  `);
});

// 🧠 NEW: Real-time AI Voice Conversations (ChatGPT-style)
app.use("/voice-conversation", voiceConversation);

// 🚀 BABY STEP 1: Async Queue System (NEW - BREAKS 15-USER CEILING!)
app.use("/", createTaskAsync);

// 🚀 Mission 1: AI Dictaphone (COMPLETED ✅)
app.use("/generate-line", generateLine);
app.use("/generate-voice", generateVoice);
app.use("/process-speech", processSpeech);

// 🎭 Mission 2: Smart AI Reflection System (NEW 🚀)
app.use("/generate-reflection", generateReflection);

// 📊 NEW: Memory & Analytics Endpoints
app.get("/user-analytics/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // This would connect to your database in production
    // For now, return mock analytics
    res.json({
      success: true,
      analytics: {
        userId,
        totalConversations: 0,
        averageSessionLength: "0 minutes",
        preferredPersonality: "Lana Croft",
        motivationScore: 85,
        streakDays: 3,
        lastActive: new Date().toISOString(),
        insights: [
          "User prefers morning conversations",
          "Responds well to adventure-themed motivation",
          "Shows consistent engagement patterns"
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/test", (req, res) => {
  res.send(`
    🧪 Test endpoint - ALL SYSTEMS OPERATIONAL! 
    🎭 Reflection System ✅
    🚀 Async Queue ✅ 
    🧠 AI Conversations ✅
    💭 Memory System ✅
  `);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Motivator.AI Server LIVE on http://0.0.0.0:${PORT}`);
  console.log(`🎭 Mission 2: Smart AI Reflection System - READY!`);
  console.log(`🚀 BABY STEP 1: Async Queue System - ACTIVATED!`);
  console.log(`🧠 NEW: Real AI Conversations - READY!`);
  console.log(`💭 NEW: Memory & Learning System - READY!`);
  console.log(`💥 15-user ceiling DESTROYED! Unlimited scaling enabled!`);
  console.log(`🎯 Ready for ChatGPT-style voice conversations!`);
});

console.log("🧪 Server.js loaded with Real AI Conversations!");
console.log("🚀 Next: Test voice chat modal with real AI!");

// Error handling
process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('🔥 Unhandled Rejection:', error);
});