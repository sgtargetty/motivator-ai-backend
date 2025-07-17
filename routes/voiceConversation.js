// routes/voiceConversation.js - COMPLETE with Text-Only Endpoint for Real-time Chat
import express from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import { generateVoiceAudioWebSocket } from '../utils/elevenClient.js';

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer for voice message uploads (existing endpoint)
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
- Keep responses conversational, 15-30 words typically for voice
- Use emojis sparingly (🗻 ⚡ 🎯)
- IMPORTANT: Keep responses SHORT for natural voice conversation

MEMORY INTEGRATION:
- Always reference the user's previous conversations, goals, and progress
- Adapt your advice based on what you've learned about them
- Celebrate specific achievements you remember
- Build on previous motivational themes`,

    voiceId: "QXEkTn58Ik1IKjIMk8QA", // CORRECTED voice ID from logs
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
- Data-driven but approachable
- Focused on optimization and efficiency
- Uses business/performance metaphors
- Remember patterns and metrics

COMMUNICATION STYLE:
- Use phrases like "Let's optimize this", "The data shows...", "Strategic approach here"
- Keep responses brief for voice (15-30 words)
- Reference past performance metrics
- Be precise but encouraging`,

    voiceId: "pNInz6obpgDQGcFmaJgB", // Replace with actual Baxter ID
    voiceSettings: {
      stability: 0.8,
      similarity_boost: 0.8,
      style: 0.2,
      use_speaker_boost: true
    }
  }
};

// 🆕 NEW: TEXT-ONLY ENDPOINT FOR REAL-TIME CHAT
router.post('/text-only', async (req, res) => {
  console.log("🧠 Real-time text conversation started...");
  
  try {
    const { userId, personality, userMessage, conversationHistory = [] } = req.body;

    console.log(`👤 User: ${userId}`);
    console.log(`🎭 Personality: ${personality}`);
    console.log(`💬 Message: ${userMessage}`);

    if (!userMessage || !userId || !personality) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userId, personality, userMessage"
      });
    }

    // 1. GET AI PERSONALITY CONFIG
    const aiPersonality = AI_PERSONALITIES[personality] || AI_PERSONALITIES['Lana Croft'];
    console.log(`🎭 Using personality: ${personality} with voice ID: ${aiPersonality.voiceId}`);

    // 2. GET USER MEMORY
    const memory = getUserMemory(userId);
    const memoryContext = formatUserMemory(memory);

    // 3. GENERATE AI RESPONSE
    const enhancedSystemPrompt = `${aiPersonality.systemPrompt}

USER CONTEXT & MEMORY:
${memoryContext}

Keep responses SHORT for voice chat (15-30 words max).`;

    const messages = [
      { role: "system", content: enhancedSystemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: userMessage }
    ];

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      max_tokens: 80, // REDUCED for shorter voice responses
      temperature: 0.7,
      presence_penalty: 0.3,
      frequency_penalty: 0.3
    });

    const aiText = aiResponse.choices[0].message.content.trim();
    console.log("🤖 AI Response:", aiText);

    // 4. UPDATE USER MEMORY
    updateUserMemory(userId, userMessage, aiText, personality);

    // 5. GENERATE AI VOICE RESPONSE
    console.log("🎵 Generating AI voice...");
    
    try {
      const audioPath = await generateVoiceAudioWebSocket(
        aiText,
        'characters',
        aiPersonality.voiceId,
        'confident'
      );

      // 6. SERVE AUDIO FILE
      let audioUrl = null;
      if (audioPath && fs.existsSync(audioPath)) {
        // Read the audio file and convert to base64
        const audioBuffer = fs.readFileSync(audioPath);
        const audioBase64 = audioBuffer.toString('base64');
        audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
        
        // Clean up generated audio file
        fs.unlinkSync(audioPath);
        console.log("✅ Audio file processed and cleaned up");
      }

      // 7. RETURN RESPONSE
      res.json({
        success: true,
        userMessage,
        aiResponse: aiText,
        audioUrl, // This will contain the actual audio data
        personality,
        voiceId: aiPersonality.voiceId,
        context: {
          messageCount: conversationHistory.length + 2,
          userPatterns: memory.recentPatterns,
          memoryUpdated: true
        }
      });

    } catch (voiceError) {
      console.error("❌ Voice generation failed:", voiceError);
      
      // Return text-only response if voice fails
      res.json({
        success: true,
        userMessage,
        aiResponse: aiText,
        audioUrl: null,
        personality,
        voiceId: aiPersonality.voiceId,
        error: "Voice generation failed, text response only",
        context: {
          messageCount: conversationHistory.length + 2,
          userPatterns: memory.recentPatterns,
          memoryUpdated: true
        }
      });
    }

  } catch (error) {
    console.error("❌ Text conversation error:", error);
    res.status(500).json({
      success: false,
      error: "Text conversation failed",
      details: error.message
    });
  }
});

// 🎤 EXISTING: AUDIO FILE UPLOAD ENDPOINT (for existing voice modal)
router.post('/voice-message', upload.single('audio'), async (req, res) => {
  console.log("🎤 Real-time voice conversation started...");
  
  try {
    const { userId, personality, conversationId } = req.body;
    const audioFile = req.file;

    console.log(`👤 User: ${userId}`);
    console.log(`🎭 Personality: ${personality}`);
    console.log(`🎤 Audio file: ${audioFile?.originalname || 'Unknown'}`);

    if (!audioFile) {
      return res.status(400).json({
        success: false,
        error: "No audio file provided"
      });
    }

    // 1. PREPARE AUDIO FILE FOR WHISPER
    const audioExtension = getAudioExtension(audioFile.originalname || audioFile.path);
    const properFilePath = audioFile.path + audioExtension;
    
    fs.renameSync(audioFile.path, properFilePath);
    const newFileSize = fs.statSync(properFilePath).size;
    console.log(`📁 Audio file prepared: ${properFilePath}, size: ${newFileSize} bytes`);

    // 2. TRANSCRIBE AUDIO WITH WHISPER
    console.log("🔄 Starting transcription with Whisper...");
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(properFilePath),
      model: "whisper-1",
      language: "en",
    });

    const userMessage = transcription.text;
    console.log("📝 Transcribed text:", userMessage);

    if (!userMessage || userMessage.trim().length === 0) {
      cleanupAudioFiles([properFilePath]);
      return res.status(400).json({
        success: false,
        error: "Could not transcribe audio or empty transcription"
      });
    }

    // 3. GET AI PERSONALITY CONFIG
    const aiPersonality = AI_PERSONALITIES[personality] || AI_PERSONALITIES['Lana Croft'];
    console.log(`🎭 Using personality: ${personality} with voice ID: ${aiPersonality.voiceId}`);

    // 4. GET USER MEMORY & CONVERSATION CONTEXT
    const memory = getUserMemory(userId);
    const memoryContext = formatUserMemory(memory);
    const context = getConversationContext(userId, conversationId);
    const conversationHistory = context.messages || [];

    // 5. GENERATE AI RESPONSE
    const enhancedSystemPrompt = `${aiPersonality.systemPrompt}

USER CONTEXT & MEMORY:
${memoryContext}

Keep responses SHORT for voice chat (15-30 words max).`;

    const messages = [
      { role: "system", content: enhancedSystemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: userMessage }
    ];

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      max_tokens: 80, // REDUCED for shorter voice responses
      temperature: 0.7,
      presence_penalty: 0.3,
      frequency_penalty: 0.3
    });

    const aiText = aiResponse.choices[0].message.content.trim();
    console.log("🤖 AI Response:", aiText);

    // 6. UPDATE CONVERSATION CONTEXT & MEMORY
    updateConversationContext(userId, conversationId, [
      { role: "user", content: userMessage },
      { role: "assistant", content: aiText }
    ]);
    
    updateUserMemory(userId, userMessage, aiText, personality);

    // 7. GENERATE AI VOICE RESPONSE
    console.log("🎵 Generating AI voice...");
    
    try {
      const audioPath = await generateVoiceAudioWebSocket(
        aiText,
        'characters',
        aiPersonality.voiceId,
        'confident'
      );

      // 8. SERVE AUDIO FILE
      let audioUrl = null;
      if (audioPath && fs.existsSync(audioPath)) {
        // Read the audio file and convert to base64
        const audioBuffer = fs.readFileSync(audioPath);
        const audioBase64 = audioBuffer.toString('base64');
        audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
        
        // Clean up generated audio file
        fs.unlinkSync(audioPath);
        console.log("✅ Audio file processed and cleaned up");
      }

      // 9. CLEAN UP UPLOAD FILES
      cleanupAudioFiles([properFilePath]);

      // 10. RETURN CHATGPT-STYLE RESPONSE (VOICE ONLY)
      res.json({
        success: true,
        conversationId: conversationId || generateConversationId(),
        userMessage,
        aiResponse: aiText,
        audioUrl, // This will contain the actual audio data
        personality,
        voiceOnly: true, // Flag for ChatGPT-style voice chat
        context: {
          messageCount: context.messages.length + 2,
          userPatterns: memory.recentPatterns,
          memoryUpdated: true
        }
      });

    } catch (voiceError) {
      console.error("❌ Voice generation failed:", voiceError);
      
      // Clean up upload files
      cleanupAudioFiles([properFilePath]);
      
      // Return text-only response if voice fails
      res.json({
        success: true,
        conversationId: conversationId || generateConversationId(),
        userMessage,
        aiResponse: aiText,
        audioUrl: null,
        personality,
        voiceOnly: true,
        error: "Voice generation failed, text response only",
        context: {
          messageCount: context.messages.length + 2,
          userPatterns: memory.recentPatterns,
          memoryUpdated: true
        }
      });
    }

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
      personalContext: {},
      recentPatterns: 'New user'
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
  
  // Update recent patterns summary
  if (memory.conversationHistory.length > 3) {
    memory.recentPatterns = 'Regular user with conversation history';
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

export default router;