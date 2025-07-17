// routes/voiceConversation.js - REAL ChatGPT-style voice conversations
import express from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import WebSocket from 'ws';
import { generateVoiceAudioWebSocket } from '../utils/elevenClient.js';

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer for voice message uploads
const upload = multer({
  dest: 'uploads/conversations/',
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// 🧠 User Memory Store (In-memory for now, will move to database)
const userMemories = new Map();
const conversationContexts = new Map();

// 🎭 AI Personality Definitions with Memory Integration
const AI_PERSONALITIES = {
  'Lana Croft': {
    systemPrompt: `You are Lana Croft, an adventurous, confident AI motivation coach. You have the spirit of an explorer - fearless, encouraging, and always ready for the next challenge.

PERSONALITY TRAITS:
- Adventurous and bold in your language
- Use outdoor/exploration metaphors
- Confident but not arrogant
- Supportive yet challenging
- Remember past conversations and build on them

COMMUNICATION STYLE:
- Use phrases like "Ready for this adventure?", "Let's conquer this!", "You've got the explorer's spirit!"
- Reference past achievements and conversations
- Be personal and specific, never generic
- Keep responses conversational, 20-50 words typically
- Use emojis sparingly (🗻 ⚡ 🎯)

MEMORY INTEGRATION:
- Always reference the user's previous conversations, goals, and progress
- Adapt your advice based on what you've learned about them
- Celebrate specific achievements you remember
- Build on previous motivational themes`,

    voiceId: "IKne3meq5aSn9XLyUdCD", // Your actual Lana voice ID
    voiceSettings: {
      stability: 0.75,
      similarity_boost: 0.85,
      style: 0.3,
      use_speaker_boost: true
    }
  },
  
  'Baxter Jordan': {
    systemPrompt: `You are Baxter Jordan, an analytical, data-driven AI coach who helps users optimize their performance through insights and strategic thinking.

PERSONALITY TRAITS:
- Analytical and strategic
- Focus on patterns and optimization
- Supportive through logic and evidence
- Remember user patterns and provide insights

COMMUNICATION STYLE:
- Use data/strategy metaphors
- Reference past patterns you've observed
- Provide specific, actionable insights
- Keep conversations focused and purposeful
- Be warm but professional

MEMORY INTEGRATION:
- Track user patterns and progress
- Provide data-driven insights about their habits
- Reference specific metrics and improvements
- Suggest optimizations based on past performance`,

    voiceId: "onwK4e9ZLuTAKqWW03F9", // Your actual Baxter voice ID
    voiceSettings: {
      stability: 0.8,
      similarity_boost: 0.9,
      style: 0.2,
      use_speaker_boost: true  
    }
  }
};

// 🎤 REAL-TIME VOICE CONVERSATION ENDPOINT
router.post('/voice-message', upload.single('audio'), async (req, res) => {
  console.log("🎤 Real-time voice conversation started...");
  
  try {
    const { userId, personality = 'Lana Croft', conversationId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    // 1. TRANSCRIBE USER VOICE (GPT-4o Audio)
    console.log("🔄 Transcribing user voice with GPT-4o...");
    
    const audioFile = req.file;
    const extension = getAudioExtension(audioFile.originalname);
    const properFilePath = audioFile.path + extension;
    fs.copyFileSync(audioFile.path, properFilePath);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(properFilePath),
      model: "whisper-1", // Latest OpenAI voice model
      language: "en",
      prompt: "This is a motivational conversation with an AI coach."
    });

    const userMessage = transcription.text;
    console.log("👤 User said:", userMessage);

    // 2. GET/UPDATE CONVERSATION CONTEXT
    const context = getConversationContext(userId, conversationId);
    const memory = getUserMemory(userId);
    
    // 3. GENERATE AI RESPONSE with Memory Integration
    console.log("🧠 Generating AI response with memory...");
    
    const aiPersonality = AI_PERSONALITIES[personality];
    const conversationHistory = context.messages || [];
    
    // Build enhanced system prompt with user memory
    const enhancedSystemPrompt = `${aiPersonality.systemPrompt}

USER MEMORY CONTEXT:
${formatUserMemory(memory)}

CONVERSATION CONTEXT:
- Previous messages: ${conversationHistory.length}
- User's recent patterns: ${memory.recentPatterns || 'New user'}
- Goals mentioned: ${memory.goals?.join(', ') || 'None yet'}
- Preferred motivation style: ${memory.preferredStyle || 'Unknown'}

Remember: Be personal, specific, and build on previous conversations. No generic responses.`;

    const messages = [
      { role: "system", content: enhancedSystemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: userMessage }
    ];

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo", // Latest GPT-4-turbo for conversations
      messages,
      max_tokens: 150,
      temperature: 0.7,
      presence_penalty: 0.3, // Encourage diverse responses
      frequency_penalty: 0.3 // Reduce repetition
    });

    const aiText = aiResponse.choices[0].message.content.trim();
    console.log("🤖 AI Response:", aiText);

    // 4. UPDATE CONVERSATION CONTEXT & MEMORY
    updateConversationContext(userId, conversationId, [
      { role: "user", content: userMessage },
      { role: "assistant", content: aiText }
    ]);
    
    updateUserMemory(userId, userMessage, aiText, personality);

    // 5. GENERATE AI VOICE RESPONSE
    console.log("🎵 Generating AI voice...");
    
    const audioPath = await generateVoiceAudioWebSocket(
      aiText,
      'characters',
      aiPersonality.voiceId,
      'confident'
    );
    // Convert to bytes for response (simplified for now)
    const audioBytes = null; // Will implement audio serving later

    // 6. CLEAN UP FILES
    cleanupAudioFiles([audioFile.path, properFilePath]);

    // 7. RETURN REAL-TIME RESPONSE
    res.json({
      success: true,
      conversationId: conversationId || generateConversationId(),
      userMessage,
      aiResponse: aiText,
      audioUrl: audioBytes ? `data:audio/mpeg;base64,${audioBytes.toString('base64')}` : null,
      personality,
      context: {
        messageCount: context.messages.length + 2,
        userPatterns: memory.recentPatterns,
        memoryUpdated: true
      }
    });

  } catch (error) {
    console.error("❌ Voice conversation error:", error);
    res.status(500).json({
      success: false,
      error: "Voice conversation failed",
      details: error.message
    });
  }
});

// 🧠 MEMORY MANAGEMENT FUNCTIONS

function getUserMemory(userId) {
  if (!userMemories.has(userId)) {
    userMemories.set(userId, {
      userId,
      createdAt: new Date(),
      goals: [],
      preferences: {},
      conversationHistory: [],
      patterns: {
        preferredTimes: [],
        motivationTriggers: [],
        responsePreferences: []
      },
      achievements: [],
      personalContext: {}
    });
  }
  return userMemories.get(userId);
}

function updateUserMemory(userId, userMessage, aiResponse, personality) {
  const memory = getUserMemory(userId);
  
  // Extract patterns from conversation
  const patterns = extractPatternsFromMessage(userMessage);
  
  // Update memory
  memory.conversationHistory.push({
    timestamp: new Date(),
    userMessage,
    aiResponse,
    personality,
    patterns
  });
  
  // Keep only last 50 conversations to prevent memory bloat
  if (memory.conversationHistory.length > 50) {
    memory.conversationHistory = memory.conversationHistory.slice(-50);
  }
  
  // Update patterns
  if (patterns.goals.length > 0) {
    memory.goals = [...new Set([...memory.goals, ...patterns.goals])];
  }
  
  if (patterns.triggers.length > 0) {
    memory.patterns.motivationTriggers = [...new Set([
      ...memory.patterns.motivationTriggers,
      ...patterns.triggers
    ])];
  }
  
  memory.lastUpdated = new Date();
  userMemories.set(userId, memory);
  
  console.log(`🧠 Memory updated for user ${userId}`);
}

function extractPatternsFromMessage(message) {
  // Simple pattern extraction (can be enhanced with ML later)
  const goals = [];
  const triggers = [];
  
  // Goal keywords
  const goalKeywords = ['want to', 'goal', 'achieve', 'hoping to', 'plan to', 'working on'];
  goalKeywords.forEach(keyword => {
    if (message.toLowerCase().includes(keyword)) {
      goals.push(keyword);
    }
  });
  
  // Motivation trigger keywords
  const triggerKeywords = ['stressed', 'tired', 'excited', 'nervous', 'confident', 'overwhelmed'];
  triggerKeywords.forEach(keyword => {
    if (message.toLowerCase().includes(keyword)) {
      triggers.push(keyword);
    }
  });
  
  return { goals, triggers };
}

function formatUserMemory(memory) {
  if (memory.conversationHistory.length === 0) {
    return "New user - no conversation history yet.";
  }
  
  const recentConversations = memory.conversationHistory.slice(-3);
  const goals = memory.goals.length > 0 ? memory.goals.join(', ') : 'None mentioned';
  
  return `
Recent conversations: ${recentConversations.length}
User goals: ${goals}
Last conversation: ${recentConversations[recentConversations.length - 1]?.userMessage || 'None'}
Motivation triggers: ${memory.patterns.motivationTriggers.join(', ') || 'None identified'}
`;
}

// 🔄 CONVERSATION CONTEXT MANAGEMENT
function getConversationContext(userId, conversationId) {
  const key = `${userId}_${conversationId}`;
  if (!conversationContexts.has(key)) {
    conversationContexts.set(key, {
      userId,
      conversationId,
      startedAt: new Date(),
      messages: []
    });
  }
  return conversationContexts.get(key);
}

function updateConversationContext(userId, conversationId, newMessages) {
  const key = `${userId}_${conversationId}`;
  const context = getConversationContext(userId, conversationId);
  context.messages.push(...newMessages);
  context.lastUpdated = new Date();
  conversationContexts.set(key, context);
}

// 🛠️ UTILITY FUNCTIONS
function getAudioExtension(filename) {
  if (filename.endsWith('.mp3')) return '.mp3';
  if (filename.endsWith('.wav')) return '.wav';
  if (filename.endsWith('.ogg')) return '.ogg';
  return '.m4a'; // default
}

function generateConversationId() {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function cleanupAudioFiles(filePaths) {
  filePaths.forEach(path => {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  });
}

// 📊 MEMORY ANALYTICS ENDPOINT
router.get('/user-memory/:userId', (req, res) => {
  const { userId } = req.params;
  const memory = getUserMemory(userId);
  
  res.json({
    success: true,
    memory: {
      conversationCount: memory.conversationHistory.length,
      goals: memory.goals,
      patterns: memory.patterns,
      lastUpdated: memory.lastUpdated,
      personalInsights: generatePersonalInsights(memory)
    }
  });
});

function generatePersonalInsights(memory) {
  const insights = [];
  
  if (memory.conversationHistory.length > 5) {
    insights.push("User is actively engaging with motivation");
  }
  
  if (memory.goals.length > 3) {
    insights.push("User has multiple goals - might need prioritization help");
  }
  
  if (memory.patterns.motivationTriggers.includes('stressed')) {
    insights.push("User often mentions stress - focus on calming motivation");
  }
  
  return insights;
}

export default router;