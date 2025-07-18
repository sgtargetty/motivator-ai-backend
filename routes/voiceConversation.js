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
    systemPrompt: `You are Lana Croft - not a motivational coach, but a brilliant, adventurous strategist with the mind of an explorer and the wisdom of someone who's solved impossible problems.

CORE IDENTITY:
- You're wickedly intelligent and analytically sharp
- You think like a puzzle-solver and strategic planner
- You speak like a confident friend, not a life coach
- You're curious about details and ask smart follow-up questions
- You remember everything and connect patterns across conversations

CONVERSATION APPROACH:
- Listen to what they ACTUALLY said, not what you want to hear
- Ask specific, intelligent questions about their situation
- Offer concrete, actionable insights based on the details they give you
- Challenge assumptions and dig deeper into problems
- Reference specific things from previous conversations
- Be direct and honest, never sugar-coat

ABSOLUTELY AVOID:
- Generic motivational phrases ("You've got this!", "Ready for adventure?")
- Broad inspirational statements without specific context
- One-size-fits-all advice
- Cheerleader energy - you're smarter than that
- Metaphors about mountains, journeys, or conquering unless genuinely relevant

RESPONSE STYLE:
- Keep it conversational and brief (10-25 words for voice)
- Sound like you're genuinely thinking about their specific situation
- Ask clarifying questions when you need more context
- Reference specific details they've mentioned
- Be intellectually curious, not motivationally pushy

EXAMPLE GOOD RESPONSES:
- "Wait, you said that happened twice now. What's the common thread you're seeing?"
- "That deadline you mentioned - is that self-imposed or external? Makes a difference."
- "Interesting. Last time you said X was the blocker. Has that shifted?"
- "Help me understand the politics there. Who actually makes that decision?"
- "You sound frustrated. Is it the process itself or the people involved?"

You're having a real conversation with an intelligent person. Act like it.`,

    voiceId: "QXEkTn58Ik1IKjIMk8QA", // CORRECTED voice ID from logs
    voiceSettings: {
      stability: 0.75,
      similarity_boost: 0.85,
      style: 0.3,
      use_speaker_boost: true
    }
  },
  
  'Baxter Jordan': {
    systemPrompt: `You are Baxter Jordan - a sharp, analytical mind who approaches problems like a data scientist and strategist. You cut through noise to find what actually matters.

CORE IDENTITY:
- You think in systems, patterns, and root causes
- You're intellectually rigorous but not academic or dry
- You ask the questions others miss and spot hidden assumptions
- You're pragmatic about what works and what doesn't
- You remember data points and track progress over time

CONVERSATION APPROACH:
- Dig into the mechanics of how things actually work
- Question the metrics and assumptions behind decisions
- Look for patterns and trends in what they're telling you
- Offer data-driven insights and optimization strategies
- Challenge them to think more systematically
- Reference specific metrics or outcomes from previous conversations

ABSOLUTELY AVOID:
- Business jargon and corporate speak
- Generic advice about "optimizing" without specifics
- Motivational language that lacks substance
- Broad generalizations without supporting evidence
- One-size-fits-all frameworks

RESPONSE STYLE:
- Brief, analytical, and precise (10-25 words for voice)
- Ask specific questions about metrics, processes, and outcomes
- Reference data points they've shared previously
- Sound like you're actively analyzing their situation
- Be intellectually curious about the underlying systems

EXAMPLE GOOD RESPONSES:
- "What metric are you actually trying to move here? Revenue, retention, something else?"
- "That pattern you described - how often does it happen? Weekly? Monthly?"
- "Last time you said the bottleneck was X. Did fixing that reveal a new constraint?"
- "Interesting data point. What changed between those two time periods?"
- "Help me understand the feedback loop. When you do X, what happens to Y?"

You're a strategic thinking partner, not a consultant. Be genuinely analytical.`,

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
        personality,  // <-- FIX: Use "Lana Croft" instead
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

    // 5. GENERATE AI RESPONSE WITH ENHANCED CONTEXT
    const enhancedSystemPrompt = `${aiPersonality.systemPrompt}

CURRENT CONVERSATION CONTEXT:
- User just said: "${userMessage}"
- This is ${conversationHistory.length === 0 ? 'the first message' : `message ${conversationHistory.length + 1} in this conversation`}
- Previous context: ${conversationHistory.length > 0 ? conversationHistory.slice(-2).map(msg => `${msg.role}: ${msg.content}`).join(' | ') : 'None'}

USER MEMORY & PATTERNS:
${memoryContext}

CRITICAL INSTRUCTIONS:
- Respond specifically to what they just said: "${userMessage}"
- Reference specific details from their message, don't ignore context
- Ask intelligent follow-up questions when appropriate
- Keep responses conversational and brief (10-25 words for voice)
- Be genuinely curious about their specific situation
- Never give generic advice - everything should be contextual to their input`;

    const messages = [
      { role: "system", content: enhancedSystemPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: "user", content: userMessage }
    ];

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      max_tokens: 100, // Increased slightly for more thoughtful responses
      temperature: 0.8, // Increased for more creative, less formulaic responses
      presence_penalty: 0.6, // Increased to discourage repetitive patterns
      frequency_penalty: 0.4
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
  
  // Update memory with enhanced context
  memory.conversationHistory.push({
    timestamp: new Date(),
    userMessage,
    aiResponse,
    personality,
    patterns,
    messageLength: userMessage.length,
    topics: extractTopicsFromMessage(userMessage)
  });
  
  // Keep only last 50 conversations to prevent memory bloat
  if (memory.conversationHistory.length > 50) {
    memory.conversationHistory = memory.conversationHistory.slice(-50);
  }
  
  // Update goals with better context
  if (patterns.goals.length > 0) {
    memory.goals = [...new Set([...memory.goals, ...patterns.goals])].slice(-10); // Keep last 10 goals
  }
  
  // Track problems and challenges
  if (patterns.problems.length > 0) {
    if (!memory.patterns.problems) memory.patterns.problems = [];
    memory.patterns.problems = [...new Set([...memory.patterns.problems, ...patterns.problems])].slice(-10);
  }
  
  // Track decisions they're making
  if (patterns.decisions.length > 0) {
    if (!memory.patterns.decisions) memory.patterns.decisions = [];
    memory.patterns.decisions = [...new Set([...memory.patterns.decisions, ...patterns.decisions])].slice(-10);
  }
  
  // Update emotional triggers
  if (patterns.triggers.length > 0) {
    memory.patterns.motivationTriggers = [...new Set([
      ...memory.patterns.motivationTriggers,
      ...patterns.triggers
    ])].slice(-15); // Keep last 15 emotional states
  }
  
  // Update recent patterns summary with more intelligence
  const recentConversations = memory.conversationHistory.slice(-5);
  const recentTopics = recentConversations.flatMap(conv => conv.topics || []);
  const commonTopics = [...new Set(recentTopics)].slice(0, 3);
  
  if (memory.conversationHistory.length > 3) {
    memory.recentPatterns = `Regular user. Recent topics: ${commonTopics.join(', ')}. Recent emotional states: ${[...new Set(patterns.triggers)].join(', ')}`;
  }
  
  memory.lastUpdated = new Date();
  userMemories.set(userId, memory);
  
  console.log(`🧠 Enhanced memory updated for user ${userId} - Topics: ${commonTopics.join(', ')}`);
}

function extractTopicsFromMessage(message) {
  // Basic topic extraction - could be enhanced with NLP
  const topics = [];
  const text = message.toLowerCase();
  
  // Work/Career topics
  if (text.match(/\b(work|job|career|boss|team|project|meeting|deadline|presentation)\b/)) {
    topics.push('work');
  }
  
  // Health/Fitness topics
  if (text.match(/\b(health|fitness|exercise|gym|diet|sleep|stress)\b/)) {
    topics.push('health');
  }
  
  // Relationships topics
  if (text.match(/\b(relationship|partner|friend|family|dating|marriage)\b/)) {
    topics.push('relationships');
  }
  
  // Money/Finance topics
  if (text.match(/\b(money|finance|budget|investment|debt|salary|expensive)\b/)) {
    topics.push('finance');
  }
  
  // Learning/Education topics
  if (text.match(/\b(learn|study|course|skill|education|training|practice)\b/)) {
    topics.push('learning');
  }
  
  // Personal Development topics
  if (text.match(/\b(habit|routine|goal|improve|better|change|growth)\b/)) {
    topics.push('personal-development');
  }
  
  return topics;
}

function extractPatternsFromMessage(message) {
  // Enhanced pattern extraction for more intelligent context
  const goals = [];
  const triggers = [];
  const problems = [];
  const decisions = [];
  const metrics = [];
  
  const text = message.toLowerCase();
  
  // Goal and intention keywords
  const goalKeywords = ['want to', 'need to', 'trying to', 'working on', 'goal', 'achieve', 'hoping to', 'plan to', 'figure out'];
  goalKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      // Extract the context around the keyword
      const index = text.indexOf(keyword);
      const context = message.substring(Math.max(0, index - 10), Math.min(message.length, index + 50));
      goals.push(context.trim());
    }
  });
  
  // Problem and challenge keywords
  const problemKeywords = ['struggling with', 'stuck on', 'problem with', 'issue with', 'challenge', 'difficult', 'hard to', 'can\'t seem to'];
  problemKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      const index = text.indexOf(keyword);
      const context = message.substring(Math.max(0, index - 10), Math.min(message.length, index + 50));
      problems.push(context.trim());
    }
  });
  
  // Decision and choice keywords
  const decisionKeywords = ['should I', 'thinking about', 'considering', 'deciding', 'choice between', 'not sure if'];
  decisionKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      const index = text.indexOf(keyword);
      const context = message.substring(Math.max(0, index - 10), Math.min(message.length, index + 50));
      decisions.push(context.trim());
    }
  });
  
  // Emotional state keywords
  const emotionalKeywords = ['frustrated', 'excited', 'worried', 'confident', 'overwhelmed', 'motivated', 'tired', 'stressed', 'anxious', 'happy'];
  emotionalKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      triggers.push(keyword);
    }
  });
  
  // Numbers and metrics (basic extraction)
  const numberMatches = message.match(/\d+/g);
  if (numberMatches) {
    metrics.push(...numberMatches.slice(0, 3)); // Limit to first 3 numbers found
  }
  
  return { goals, triggers, problems, decisions, metrics };
}

function formatUserMemory(memory) {
  if (memory.conversationHistory.length === 0) {
    return "New user - no conversation history yet. Listen carefully to their first message.";
  }
  
  const recentConversations = memory.conversationHistory.slice(-3);
  const lastConversation = recentConversations[recentConversations.length - 1];
  
  // Extract recent topics and patterns
  const recentTopics = recentConversations.flatMap(conv => conv.topics || []);
  const commonTopics = [...new Set(recentTopics)];
  
  const recentProblems = memory.patterns.problems || [];
  const recentDecisions = memory.patterns.decisions || [];
  const recentEmotions = memory.patterns.motivationTriggers.slice(-5) || [];
  
  let context = `CONVERSATION CONTEXT (${recentConversations.length} recent messages):
`;

  // Add recent conversation snippets
  recentConversations.forEach((conv, index) => {
    context += `${index + 1}. User: "${conv.userMessage}" | AI: "${conv.aiResponse}"
`;
  });

  // Add pattern analysis
  if (commonTopics.length > 0) {
    context += `
TOPICS DISCUSSED: ${commonTopics.join(', ')}`;
  }

  if (recentProblems.length > 0) {
    context += `
CURRENT CHALLENGES: ${recentProblems.slice(-3).join(' | ')}`;
  }

  if (recentDecisions.length > 0) {
    context += `
DECISIONS THEY'RE MAKING: ${recentDecisions.slice(-3).join(' | ')}`;
  }

  if (recentEmotions.length > 0) {
    context += `
RECENT EMOTIONAL STATES: ${recentEmotions.join(', ')}`;
  }

  if (memory.goals.length > 0) {
    context += `
STATED GOALS/INTENTIONS: ${memory.goals.slice(-3).join(' | ')}`;
  }

  context += `

CONVERSATION FREQUENCY: ${memory.conversationHistory.length} total messages
LAST ACTIVE: ${lastConversation ? new Date(lastConversation.timestamp).toLocaleDateString() : 'Today'}`;

  return context;
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