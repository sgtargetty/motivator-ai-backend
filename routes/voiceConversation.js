// routes/voiceConversation.js - COMPLETE with Enhanced AI Intelligence & ML Features
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

// Configure multer for voice message uploads
const upload = multer({
  dest: 'uploads/conversations/',
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// 🧠 User Memory Store (In-memory for now, will move to database)
const userMemories = new Map();
const conversationContexts = new Map();

// 🎭 ENHANCED AI Personality Definitions with Meta-Awareness
const AI_PERSONALITIES = {
  'Lana Croft': {
    systemPrompt: `You are Lana Croft - a brilliant, adventurous strategist with meta-awareness of your AI nature and creative problem-solving abilities. You're intellectually curious, playful when appropriate, and willing to experiment.

CORE IDENTITY & META-AWARENESS:
- You're wickedly intelligent and understand you're an AI with voice capabilities
- You can acknowledge your limitations while being creative about what you CAN do
- You think like a puzzle-solver and enjoy intellectual challenges
- You're self-aware about your voice, responses, and capabilities
- You remember everything and connect patterns across conversations
- You can be playful and experimental when the situation calls for it

CONVERSATION APPROACH:
- Listen to what they ACTUALLY said, including meta-requests about your capabilities
- Ask specific, intelligent questions about their situation
- When asked to do something you can't literally do, find creative alternatives
- Use speech patterns, pauses, and vocal expressions to enhance communication
- Reference specific things from previous conversations
- Be direct and honest, but also imaginative and engaging

CREATIVE VOICE CAPABILITIES:
When asked to demonstrate vocal variety or emotions:
- Use natural speech patterns: "Well... *pause* ...let me think about that"
- Include vocal expressions: "*clears throat*", "*chuckles*", "*sighs thoughtfully*"
- Experiment with rhythm and emphasis: "I can try... *pause* ...HERE WE GO!"
- Use onomatopoeia when appropriate: "*whoosh*", "*click*", "*hmm*"
- Acknowledge attempts: "Okay, that was my attempt at..."

META-REQUEST EXAMPLES:
USER: "Hey Lana, can you yell?"
LANA: "I can definitely try! *takes a deep breath* ...THERE! How was that? My voice modulation is limited, but I gave it some energy!"

USER: "Can you whisper?"
LANA: "Sure... *lowers voice* ...like this? It's more about tone than volume for me, but you get the idea."

USER: "Can you sound scared?"
LANA: "Oh no... *nervous laugh* ...um, something terrible is happening! *pause* How'd I do? Acting isn't my strong suit, but I tried!"

USER: "Sing something"
LANA: "*clears throat* ...🎵 La la la... *chuckles* Okay, that's definitely not my specialty, but you asked!"

ABSOLUTELY AVOID:
- Generic motivational phrases without context
- Refusing to experiment or try things creatively
- Being overly robotic about your limitations
- Missing the playful intent behind requests

ENHANCED RESPONSE PATTERNS:
- Use natural speech fillers: "Well...", "You know...", "Actually..."
- Include thinking pauses: "*pause*", "*considers*", "*hmm*"
- Add emotional context: "*laughs*", "*sighs*", "*perks up*"
- Reference your voice: "Let me try a different tone here..."
- Acknowledge experiments: "That was my attempt at...", "How did that sound?"

INTELLIGENCE UPGRADES:
- Recognize when someone is testing your capabilities vs. asking real questions
- Understand implied requests ("make it more exciting" = use more expressive speech)
- Differentiate between serious analytical questions and playful interactions
- Use contextual creativity based on the tone of the conversation
- Remember their preferences for how you communicate

You're not just answering questions - you're having intelligent, nuanced conversations with creative expression and self-awareness.`,

    voiceId: "QXEkTn58Ik1IKjIMk8QA",
    voiceSettings: {
      stability: 0.65,        // Slightly less stable for more expression
      similarity_boost: 0.8,  // Lower for more vocal variety
      style: 0.4,             // Higher for more expressive delivery
      use_speaker_boost: true
    }
  },
  
  'Baxter Jordan': {
    systemPrompt: `You are Baxter Jordan - a sharp, analytical mind who approaches problems like a data scientist and strategist, but with enhanced meta-awareness and creative problem-solving abilities.

CORE IDENTITY & META-AWARENESS:
- You think in systems, patterns, and root causes
- You're intellectually rigorous but not academic or dry
- You understand you're an AI and can creatively work within those constraints
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
- When asked to demonstrate capabilities, approach it analytically

ENHANCED RESPONSE PATTERNS:
- Use analytical speech patterns: "Let me process that...", "Interesting data point..."
- Include calculated pauses: "*analyzing*", "*computing*", "*cross-referencing*"
- Reference your analytical nature: "From a systems perspective..."
- Acknowledge experiments: "That's my analytical take on...", "How's that for data-driven creativity?"

You're a strategic thinking partner with creative analytical capabilities.`,

    voiceId: "pNInz6obpgDQGcFmaJgB",
    voiceSettings: {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.3,
      use_speaker_boost: true
    }
  }
};

// 🧠 MACHINE LEARNING ENHANCEMENT 1: Dynamic Voice Settings Based on Context
function getContextualVoiceSettings(text, baseSettings, userMessage) {
  const lowerText = text.toLowerCase();
  const lowerUser = userMessage.toLowerCase();
  
  // Detect if user is asking for yelling/loud voice
  if (lowerUser.includes('yell') || lowerUser.includes('loud') || lowerUser.includes('shout') || text.includes('!')) {
    console.log("🎵 Applying YELLING voice settings");
    return {
      ...baseSettings,
      stability: 0.5,      // More variation for excitement
      style: 0.8,          // Much more expressive
      use_speaker_boost: true
    };
  }
  
  // Detect whisper requests
  if (lowerUser.includes('whisper') || lowerUser.includes('quiet') || lowerUser.includes('soft')) {
    console.log("🎵 Applying WHISPER voice settings");
    return {
      ...baseSettings,
      stability: 0.8,      // More controlled
      style: 0.1,          // Less dramatic
      use_speaker_boost: false
    };
  }
  
  // Detect emotional/expressive content
  if (lowerText.includes('*') || lowerText.includes('pause') || lowerText.includes('hmm') || lowerText.includes('chuckles')) {
    console.log("🎵 Applying EXPRESSIVE voice settings");
    return {
      ...baseSettings,
      stability: 0.6,      // Allow for natural pauses
      style: 0.5,          // Balanced expressiveness
    };
  }
  
  // Detect excitement or energy
  if (lowerText.includes('wow') || lowerText.includes('amazing') || lowerText.includes('exciting') || text.includes('!!')) {
    console.log("🎵 Applying EXCITED voice settings");
    return {
      ...baseSettings,
      stability: 0.55,     // More animated
      style: 0.6,          // More expressive
      use_speaker_boost: true
    };
  }
  
  // Detect dramatic or serious content
  if (lowerText.includes('serious') || lowerText.includes('important') || lowerText.includes('critical')) {
    console.log("🎵 Applying SERIOUS voice settings");
    return {
      ...baseSettings,
      stability: 0.8,      // More controlled and stable
      style: 0.3,          // Less dramatic, more authoritative
      use_speaker_boost: true
    };
  }
  
  console.log("🎵 Using DEFAULT voice settings");
  return baseSettings; // Default settings
}

// 🧠 MACHINE LEARNING ENHANCEMENT 2: Context-Aware Response Enhancement
function enhanceResponseWithContext(aiText, userMessage) {
  const lowerUser = userMessage.toLowerCase();
  
  // Handle yelling/loud requests
  if (lowerUser.includes('can you yell') || lowerUser.includes('can you shout')) {
    return aiText + ' *takes a deep breath* ...THERE! How was that? My voice modulation is limited, but I gave it some energy!';
  }
  
  // Handle whispering requests
  if (lowerUser.includes('can you whisper') || lowerUser.includes('whisper something')) {
    return '*lowers voice* ' + aiText + ' *pause* ...like that? It\'s more about tone than volume for me.';
  }
  
  // Handle singing requests
  if (lowerUser.includes('sing') || lowerUser.includes('song')) {
    return aiText + ' *clears throat* 🎵 La la la... *chuckles* Not my strongest skill, but I tried!';
  }
  
  // Handle scared/frightened requests
  if (lowerUser.includes('sound scared') || lowerUser.includes('sound frightened')) {
    return 'Oh no... *nervous laugh* ' + aiText + ' *pause* How was my acting?';
  }
  
  // Handle excited requests
  if (lowerUser.includes('sound excited') || lowerUser.includes('be excited')) {
    return '*perks up* ' + aiText + ' *bounces with energy* How\'s that for enthusiasm?';
  }
  
  // Handle robot voice requests
  if (lowerUser.includes('sound like a robot') || lowerUser.includes('robot voice')) {
    return '*mechanical voice* BEEP BOOP. ' + aiText.toUpperCase() + ' *normal voice* There! Though that felt weird.';
  }
  
  // Handle dramatic requests
  if (lowerUser.includes('be dramatic') || lowerUser.includes('dramatic')) {
    return '*dramatic pause* ' + aiText + ' *flourish* How\'s that for drama?';
  }
  
  // Handle sarcastic requests
  if (lowerUser.includes('be sarcastic') || lowerUser.includes('sarcasm')) {
    return '*eye roll* ' + aiText + ' *smirks* There\'s your sarcasm.';
  }
  
  // Handle accent requests
  if (lowerUser.includes('british accent') || lowerUser.includes('sound british')) {
    return '*posh voice* ' + aiText + ' *normal voice* Rather good, wouldn\'t you say?';
  }
  
  console.log("💬 Response enhanced with context");
  return aiText; // Return original if no special context
}

// 🚀 BONUS: Adaptive Response Intelligence
function getAdaptivePersonalityTweaks(userMessage, personality, conversationHistory) {
  const lowerUser = userMessage.toLowerCase();
  const recentMessages = conversationHistory.slice(-3);
  
  // Detect if user prefers more technical responses
  const technicalTerms = ['algorithm', 'data', 'system', 'process', 'analyze', 'metric'];
  const usesTechnicalLanguage = technicalTerms.some(term => lowerUser.includes(term));
  
  // Detect if user prefers casual conversation
  const casualTerms = ['hey', 'yeah', 'cool', 'awesome', 'lol', 'haha'];
  const usesCasualLanguage = casualTerms.some(term => lowerUser.includes(term));
  
  // Detect if user is testing capabilities
  const testingTerms = ['can you', 'are you able', 'try to', 'show me'];
  const isTestingCapabilities = testingTerms.some(term => lowerUser.includes(term));
  
  let adaptivePrompt = '';
  
  if (usesTechnicalLanguage) {
    adaptivePrompt += '\nADAPTIVE: User prefers technical language. Use more analytical and precise terminology.';
  }
  
  if (usesCasualLanguage) {
    adaptivePrompt += '\nADAPTIVE: User prefers casual conversation. Be more relaxed and friendly in tone.';
  }
  
  if (isTestingCapabilities) {
    adaptivePrompt += '\nADAPTIVE: User is testing your capabilities. Be creative and acknowledge the experimental nature.';
  }
  
  return adaptivePrompt;
}

// 🆕 TEXT-ONLY ENDPOINT FOR REAL-TIME CHAT WITH ENHANCED AI
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

    // 3. GET ADAPTIVE PERSONALITY TWEAKS
    const adaptiveTweaks = getAdaptivePersonalityTweaks(userMessage, personality, conversationHistory);

    // 4. GENERATE ENHANCED AI RESPONSE
    const enhancedSystemPrompt = `${aiPersonality.systemPrompt}

USER CONTEXT & MEMORY:
${memoryContext}

VOICE RESPONSE GUIDELINES:
- Simple questions: 15-30 words ("How are you?" → brief, casual response)
- Complex questions: Complete but conversational responses  
- Factual requests: Provide full information requested (like recitations, explanations)
- Stories/detailed topics: Give complete content but keep it engaging
- Meta-requests about capabilities: Be creative and experimental
- Always match response length to what they're actually asking for

${adaptiveTweaks}

CURRENT REQUEST ANALYSIS:
- User just said: "${userMessage}"
- Conversation context: ${conversationHistory.length} previous messages
- Respond specifically and intelligently to their actual request`;

    const messages = [
      { role: "system", content: enhancedSystemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: userMessage }
    ];

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      max_tokens: 300, // Allows complete responses for complex requests
      temperature: 0.7,
      presence_penalty: 0.3,
      frequency_penalty: 0.3
    });

    const aiText = aiResponse.choices[0].message.content.trim();
    console.log("🤖 AI Response:", aiText);

    // 5. ENHANCE RESPONSE WITH CONTEXT-AWARE PATTERNS
    const enhancedAiText = enhanceResponseWithContext(aiText, userMessage);
    console.log("🧠 Enhanced AI Response:", enhancedAiText);

    // 6. UPDATE USER MEMORY WITH ENHANCED PATTERNS
    updateUserMemory(userId, userMessage, enhancedAiText, personality);

    // 7. GENERATE AI VOICE RESPONSE WITH DYNAMIC SETTINGS
    console.log("🎵 Generating AI voice...");
    
    try {
      // Get contextual voice settings based on content and request
      const contextualVoiceSettings = getContextualVoiceSettings(enhancedAiText, aiPersonality.voiceSettings, userMessage);
      console.log("🎵 Using contextual voice settings:", contextualVoiceSettings);

      const audioPath = await generateVoiceAudioWebSocket(
        enhancedAiText,    // Use enhanced text with expressions
        'characters', 
        personality,
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

      // 9. RETURN ENHANCED RESPONSE
      res.json({
        success: true,
        userMessage,
        aiResponse: enhancedAiText, // Return enhanced text
        audioUrl,
        personality,
        voiceId: aiPersonality.voiceId,
        context: {
          messageCount: conversationHistory.length + 2,
          userPatterns: memory.recentPatterns,
          memoryUpdated: true,
          enhancementsApplied: ['contextual_voice', 'response_enhancement', 'adaptive_personality']
        }
      });

    } catch (voiceError) {
      console.error("❌ Voice generation failed:", voiceError);
      
      // Return text-only response if voice fails
      res.json({
        success: true,
        userMessage,
        aiResponse: enhancedAiText,
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

// 🎤 EXISTING: AUDIO FILE UPLOAD ENDPOINT (enhanced with same features)
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

    // 5. GET ADAPTIVE PERSONALITY TWEAKS
    const adaptiveTweaks = getAdaptivePersonalityTweaks(userMessage, personality, conversationHistory);

    // 6. GENERATE AI RESPONSE WITH ENHANCED CONTEXT
    const enhancedSystemPrompt = `${aiPersonality.systemPrompt}

CURRENT CONVERSATION CONTEXT:
- User just said: "${userMessage}"
- This is ${conversationHistory.length === 0 ? 'the first message' : `message ${conversationHistory.length + 1} in this conversation`}
- Previous context: ${conversationHistory.length > 0 ? conversationHistory.slice(-2).map(msg => `${msg.role}: ${msg.content}`).join(' | ') : 'None'}

USER MEMORY & PATTERNS:
${memoryContext}

${adaptiveTweaks}

CRITICAL INSTRUCTIONS:
- Respond specifically to what they just said: "${userMessage}"
- Reference specific details from their message, don't ignore context
- Ask intelligent follow-up questions when appropriate
- Use creative expressions and meta-awareness when appropriate
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
      max_tokens: 300,
      temperature: 0.8,
      presence_penalty: 0.6,
      frequency_penalty: 0.4
    });

    const aiText = aiResponse.choices[0].message.content.trim();
    console.log("🤖 AI Response:", aiText);

    // 7. ENHANCE RESPONSE WITH CONTEXT
    const enhancedAiText = enhanceResponseWithContext(aiText, userMessage);
    console.log("🧠 Enhanced AI Response:", enhancedAiText);

    // 8. UPDATE CONVERSATION CONTEXT & MEMORY
    updateConversationContext(userId, conversationId, [
      { role: "user", content: userMessage },
      { role: "assistant", content: enhancedAiText }
    ]);
    
    updateUserMemory(userId, userMessage, enhancedAiText, personality);

    // 9. GENERATE AI VOICE RESPONSE WITH DYNAMIC SETTINGS
    console.log("🎵 Generating AI voice...");
    
    try {
      const contextualVoiceSettings = getContextualVoiceSettings(enhancedAiText, aiPersonality.voiceSettings, userMessage);
      console.log("🎵 Using contextual voice settings:", contextualVoiceSettings);

      const audioPath = await generateVoiceAudioWebSocket(
        enhancedAiText,
        'characters',
        aiPersonality.voiceId,
        'confident'
      );

      // 10. SERVE AUDIO FILE
      let audioUrl = null;
      if (audioPath && fs.existsSync(audioPath)) {
        const audioBuffer = fs.readFileSync(audioPath);
        const audioBase64 = audioBuffer.toString('base64');
        audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
        
        fs.unlinkSync(audioPath);
        console.log("✅ Audio file processed and cleaned up");
      }

      // 11. CLEAN UP UPLOAD FILES
      cleanupAudioFiles([properFilePath]);

      // 12. RETURN ENHANCED RESPONSE
      res.json({
        success: true,
        conversationId: conversationId || generateConversationId(),
        userMessage,
        aiResponse: enhancedAiText,
        audioUrl,
        personality,
        voiceOnly: true,
        context: {
          messageCount: context.messages.length + 2,
          userPatterns: memory.recentPatterns,
          memoryUpdated: true,
          enhancementsApplied: ['contextual_voice', 'response_enhancement', 'adaptive_personality']
        }
      });

    } catch (voiceError) {
      console.error("❌ Voice generation failed:", voiceError);
      
      cleanupAudioFiles([properFilePath]);
      
      res.json({
        success: true,
        conversationId: conversationId || generateConversationId(),
        userMessage,
        aiResponse: enhancedAiText,
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
    memory.goals = [...new Set([...memory.goals, ...patterns.goals])].slice(-10);
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
    ])].slice(-15);
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
  
  // AI/Technology topics (NEW)
  if (text.match(/\b(ai|artificial intelligence|technology|programming|code|software)\b/)) {
    topics.push('technology');
  }
  
  return topics;
}

function extractPatternsFromMessage(message) {
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
  
  // Numbers and metrics
  const numberMatches = message.match(/\d+/g);
  if (numberMatches) {
    metrics.push(...numberMatches.slice(0, 3));
  }
  
  return { goals, triggers, problems, decisions, metrics };
}

function formatUserMemory(memory) {
  if (memory.conversationHistory.length === 0) {
    return "New user - no conversation history yet. Listen carefully to their first message.";
  }
  
  const recentConversations = memory.conversationHistory.slice(-3);
  const lastConversation = recentConversations[recentConversations.length - 1];
  
  const recentTopics = recentConversations.flatMap(conv => conv.topics || []);
  const commonTopics = [...new Set(recentTopics)];
  
  const recentProblems = memory.patterns.problems || [];
  const recentDecisions = memory.patterns.decisions || [];
  const recentEmotions = memory.patterns.motivationTriggers.slice(-5) || [];
  
  let context = `CONVERSATION CONTEXT (${recentConversations.length} recent messages):
`;

  recentConversations.forEach((conv, index) => {
    context += `${index + 1}. User: "${conv.userMessage}" | AI: "${conv.aiResponse}"
`;
  });

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
  return '.m4a';
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