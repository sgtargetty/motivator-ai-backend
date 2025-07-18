// routes/voiceConversation.js - COMPLETE with Enhanced AI Intelligence & ML Features
// 🚀 ENHANCED META-AWARENESS SYSTEM - Ready for Copy/Paste Deployment
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

// 🚀 NEW: PRE-PROCESSING SYSTEM PROMPT ENHANCEMENT FOR META-AWARENESS
function generateMetaAwareSystemPrompt(userMessage, baseSystemPrompt) {
  const lowerUser = userMessage.toLowerCase();
  
  // Detect meta-capability requests and prioritize them
  const metaRequests = [
    'can you yell', 'can you shout', 'yell something',
    'can you whisper', 'whisper something', 'speak quietly',
    'can you sing', 'sing something', 'song',
    'sound scared', 'sound frightened', 'be scared',
    'sound excited', 'be excited', 'show enthusiasm',
    'sound like a robot', 'robot voice', 'be robotic',
    'be dramatic', 'sound dramatic', 'drama',
    'be sarcastic', 'use sarcasm', 'sound sarcastic',
    'british accent', 'sound british', 'accent',
    'laugh', 'chuckle', 'giggle'
  ];
  
  const isMetaRequest = metaRequests.some(request => lowerUser.includes(request));
  
  if (isMetaRequest) {
    console.log("🎯 META-REQUEST DETECTED:", userMessage);
    return `${baseSystemPrompt}

🎯 CRITICAL META-REQUEST DETECTED: "${userMessage}"

IMMEDIATE RESPONSE PRIORITY:
- The user is asking you to DEMONSTRATE a capability, not EXPLAIN it
- DO NOT explain what yelling/whispering/singing is - actually TRY to do it
- Start your response by attempting the requested vocal expression
- Then acknowledge your attempt and ask how it was
- Be creative, experimental, and playful - this is about performance, not information

RESPONSE PATTERN FOR META-REQUESTS:
1. ATTEMPT the requested expression immediately
2. ACKNOWLEDGE your attempt
3. ASK for feedback on your performance

EXAMPLE RESPONSES:
User: "Can you yell?"
You: "I can definitely try! *takes a deep breath* HERE WE GO! HELLO THERE! *normal voice* How was that? My voice modulation is limited, but I gave it some energy!"

User: "Can you whisper?"
You: "*lowers voice* Like this... can you hear me okay? *pause* It's more about tone than volume for me, but that was my attempt at whispering."

AVOID: Explaining what yelling/whispering/singing is instead of trying it.`;
  }
  
  return baseSystemPrompt;
}

// 🧠 ENHANCED: Context-Aware Response Enhancement (More Aggressive Pattern Matching)
function enhanceResponseWithContext(aiText, userMessage) {
  const lowerUser = userMessage.toLowerCase();
  
  // More aggressive pattern matching for meta-requests - Replace explanatory text entirely
  
  // Handle yelling/loud requests - Replace explanatory responses
  if (lowerUser.includes('yell') || lowerUser.includes('shout') || lowerUser.includes('loud')) {
    console.log("🎯 Enhancing YELLING response");
    if (aiText.toLowerCase().includes('yelling is') || aiText.toLowerCase().includes('shouting is') || aiText.toLowerCase().includes('raising your voice')) {
      return '*takes a deep breath* HERE WE GO! HELLO THERE! THAT WAS ME TRYING TO YELL! *normal voice* How was that? My voice modulation is limited, but I gave it some energy!';
    }
    return `*takes a deep breath* ...${aiText.toUpperCase()}! *normal voice* That was my attempt at yelling! How did I do?`;
  }
  
  // Handle whispering requests
  if (lowerUser.includes('whisper') || lowerUser.includes('quiet') || lowerUser.includes('soft')) {
    console.log("🎯 Enhancing WHISPER response");
    if (aiText.toLowerCase().includes('whispering is') || aiText.toLowerCase().includes('speaking quietly') || aiText.toLowerCase().includes('lowering your voice')) {
      return '*lowers voice* Like this... can you hear me okay? *pause* That was my attempt at whispering. It\'s more about tone than volume for me.';
    }
    return `*lowers voice* ${aiText.toLowerCase()} *pause* ...how was that whisper attempt?`;
  }
  
  // Handle singing requests
  if (lowerUser.includes('sing') || lowerUser.includes('song')) {
    console.log("🎯 Enhancing SINGING response");
    if (aiText.toLowerCase().includes('singing is') || aiText.toLowerCase().includes('music') || aiText.toLowerCase().includes('melody')) {
      return '*clears throat* 🎵 La la la la la... *chuckles* That was definitely not my specialty! I tried though. How was my singing attempt?';
    }
    return `*clears throat* 🎵 ${aiText} la la la... *laughs* Not exactly Broadway material, but I gave it a shot!`;
  }
  
  // Handle scared/frightened requests
  if (lowerUser.includes('scared') || lowerUser.includes('frightened') || lowerUser.includes('afraid')) {
    console.log("🎯 Enhancing SCARED response");
    return `Oh no... *nervous laugh* ...um... ${aiText} *shaky voice* Eek! How was that? Acting scared isn't exactly my strong suit!`;
  }
  
  // Handle excited requests
  if (lowerUser.includes('excited') || lowerUser.includes('enthusiasm') || lowerUser.includes('energetic')) {
    console.log("🎯 Enhancing EXCITED response");
    return `*perks up* OH WOW! ${aiText}! *bouncing with energy* That's SO COOL! How's that for enthusiasm?`;
  }
  
  // Handle robot voice requests
  if (lowerUser.includes('robot') && lowerUser.includes('voice')) {
    console.log("🎯 Enhancing ROBOT response");
    return `*mechanical voice* BEEP. BOOP. ${aiText.toUpperCase().replace(/[.,!?]/g, '. BEEP.')} *normal voice* There! That felt weird but I tried!`;
  }
  
  // Handle dramatic requests
  if (lowerUser.includes('dramatic')) {
    console.log("🎯 Enhancing DRAMATIC response");
    return `*dramatic pause* ...${aiText}... *theatrical flourish* AND SCENE! How was that for drama?`;
  }
  
  // Handle sarcastic requests
  if (lowerUser.includes('sarcastic') || lowerUser.includes('sarcasm')) {
    console.log("🎯 Enhancing SARCASTIC response");
    return `*eye roll* Oh sure... ${aiText} *smirks* ...because that's TOTALLY what you wanted to hear. There's your sarcasm!`;
  }
  
  // Handle accent requests
  if (lowerUser.includes('british') || lowerUser.includes('accent')) {
    console.log("🎯 Enhancing ACCENT response");
    return `*posh voice* ${aiText}, old chap! *normal voice* Rather convincing, wouldn't you say? That was my British attempt!`;
  }
  
  // Handle laugh/chuckle requests
  if (lowerUser.includes('laugh') || lowerUser.includes('chuckle')) {
    console.log("🎯 Enhancing LAUGH response");
    return `*chuckles* Haha! ${aiText} *giggles* There you go! How was that laugh?`;
  }
  
  console.log("💬 No meta-request detected, using original response");
  return aiText;
}

// 🧠 ENHANCED: Dynamic Voice Settings Based on Context (More Dramatic Differences)
function getContextualVoiceSettings(text, baseSettings, userMessage) {
  const lowerText = text.toLowerCase();
  const lowerUser = userMessage.toLowerCase();
  
  // YELLING - Much more aggressive settings for noticeable difference
  if (lowerUser.includes('yell') || lowerUser.includes('loud') || lowerUser.includes('shout')) {
    console.log("🎵 Applying DRAMATIC YELLING voice settings");
    return {
      stability: 0.3,          // Much less stable for energy
      similarity_boost: 0.6,   // Lower for more variation
      style: 0.9,              // Maximum expressiveness
      use_speaker_boost: true
    };
  }
  
  // WHISPERING - Much softer settings
  if (lowerUser.includes('whisper') || lowerUser.includes('quiet') || lowerUser.includes('soft')) {
    console.log("🎵 Applying DRAMATIC WHISPER voice settings");
    return {
      stability: 0.9,          // Very controlled
      similarity_boost: 0.9,   // Keep similarity high
      style: 0.1,              // Minimal drama
      use_speaker_boost: false
    };
  }
  
  // EXCITED - High energy settings
  if (lowerUser.includes('excited') || lowerUser.includes('enthusiasm') || text.includes('WOW') || text.includes('!!')) {
    console.log("🎵 Applying HIGH ENERGY voice settings");
    return {
      stability: 0.4,          // Less stable for excitement
      similarity_boost: 0.7,   // More variation
      style: 0.8,              // High expressiveness
      use_speaker_boost: true
    };
  }
  
  // SCARED/NERVOUS - Shaky settings
  if (lowerUser.includes('scared') || lowerUser.includes('frightened') || text.includes('*nervous*')) {
    console.log("🎵 Applying NERVOUS/SCARED voice settings");
    return {
      stability: 0.2,          // Very unstable for nervousness
      similarity_boost: 0.8,   
      style: 0.6,              
      use_speaker_boost: false
    };
  }
  
  // DRAMATIC - Theatrical settings
  if (lowerUser.includes('dramatic') || text.includes('*dramatic*')) {
    console.log("🎵 Applying THEATRICAL voice settings");
    return {
      stability: 0.5,          
      similarity_boost: 0.7,   
      style: 0.9,              // Maximum drama
      use_speaker_boost: true
    };
  }
  
  // ROBOT - Mechanical settings
  if (lowerUser.includes('robot')) {
    console.log("🎵 Applying ROBOTIC voice settings");
    return {
      stability: 0.95,         // Very stable and mechanical
      similarity_boost: 0.5,   // Different from normal voice
      style: 0.0,              // No expression
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
  
  // Detect serious content
  if (lowerText.includes('serious') || lowerText.includes('important') || lowerText.includes('critical')) {
    console.log("🎵 Applying SERIOUS voice settings");
    return {
      ...baseSettings,
      stability: 0.8,      // More controlled and stable
      style: 0.3,          // Less dramatic, more authoritative
      use_speaker_boost: true
    };
  }
  
  console.log("🎵 Using ENHANCED DEFAULT voice settings");
  return {
    ...baseSettings,
    style: 0.5,              // Slightly more expressive than original
    stability: 0.7           // Slightly less stable for variation
  };
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

    // 4. GENERATE ENHANCED AI RESPONSE WITH META-AWARENESS
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

    // 🚀 ENHANCED: Use meta-aware system prompt for better capability handling
    const metaAwareSystemPrompt = generateMetaAwareSystemPrompt(userMessage, enhancedSystemPrompt);

    const messages = [
      { role: "system", content: metaAwareSystemPrompt }, // Enhanced prompt
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: userMessage }
    ];

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      max_tokens: 300, // Allows complete responses for complex requests
      temperature: 0.8,  // Slightly higher for creativity with meta-requests
      presence_penalty: 0.3,
      frequency_penalty: 0.3
    });

    const aiText = aiResponse.choices[0].message.content.trim();
    console.log("🤖 AI Response:", aiText);

    // 5. ENHANCE RESPONSE WITH AGGRESSIVE CONTEXT-AWARE PATTERNS
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
          enhancementsApplied: ['meta_awareness', 'contextual_voice', 'response_enhancement', 'adaptive_personality']
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
          memoryUpdated: true,
          enhancementsApplied: ['meta_awareness', 'response_enhancement', 'adaptive_personality']
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

    // 🚀 ENHANCED: Use meta-aware system prompt
    const metaAwareSystemPrompt = generateMetaAwareSystemPrompt(userMessage, enhancedSystemPrompt);

    const messages = [
      { role: "system", content: metaAwareSystemPrompt },
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
          enhancementsApplied: ['meta_awareness', 'contextual_voice', 'response_enhancement', 'adaptive_personality']
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
          memoryUpdated: true,
          enhancementsApplied: ['meta_awareness', 'response_enhancement', 'adaptive_personality']
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
    memory.recentPatterns = `Regular user. Recent topics: ${commonTopics.join(', ')}. Prefers ${personality} personality.`;
  } else {
    memory.recentPatterns = `New user exploring ${personality} personality.`;
  }
  
  userMemories.set(userId, memory);
}

function formatUserMemory(memory) {
  if (!memory || memory.conversationHistory.length === 0) {
    return "New user - no conversation history yet.";
  }
  
  const recentConversations = memory.conversationHistory.slice(-3);
  const lastConversation = recentConversations[recentConversations.length - 1];
  
  let context = `USER MEMORY CONTEXT:
- Total conversations: ${memory.conversationHistory.length}
- Recent patterns: ${memory.recentPatterns}
- Current goals: ${memory.goals.slice(-3).join(', ') || 'None identified yet'}`;

  if (memory.patterns.motivationTriggers && memory.patterns.motivationTriggers.length > 0) {
    context += `
- Motivation triggers: ${memory.patterns.motivationTriggers.slice(-5).join(', ')}`;
  }

  if (lastConversation) {
    context += `
- Last conversation: ${new Date(lastConversation.timestamp).toLocaleDateString() === new Date().toLocaleDateString() ? 'Today' : new Date(lastConversation.timestamp).toLocaleDateString()}`;
  }

  return context;
}

function extractPatternsFromMessage(message) {
  const lowerMessage = message.toLowerCase();
  
  // Extract goals
  const goalKeywords = ['want to', 'goal', 'plan to', 'hoping to', 'trying to', 'need to'];
  const goals = goalKeywords.filter(keyword => lowerMessage.includes(keyword))
    .map(keyword => {
      const index = lowerMessage.indexOf(keyword);
      return message.substring(index, index + 50).trim();
    });

  // Extract problems
  const problemKeywords = ['struggling with', 'problem', 'issue', 'challenge', 'difficult', 'stuck'];
  const problems = problemKeywords.filter(keyword => lowerMessage.includes(keyword))
    .map(keyword => {
      const index = lowerMessage.indexOf(keyword);
      return message.substring(index, index + 50).trim();
    });

  // Extract decisions
  const decisionKeywords = ['should i', 'deciding', 'choice', 'option', 'thinking about'];
  const decisions = decisionKeywords.filter(keyword => lowerMessage.includes(keyword))
    .map(keyword => {
      const index = lowerMessage.indexOf(keyword);
      return message.substring(index, index + 50).trim();
    });

  // Extract emotional triggers
  const triggers = [];
  if (lowerMessage.includes('excited') || lowerMessage.includes('motivated')) triggers.push('excitement');
  if (lowerMessage.includes('stressed') || lowerMessage.includes('overwhelmed')) triggers.push('stress');
  if (lowerMessage.includes('confused') || lowerMessage.includes('unclear')) triggers.push('clarity');
  
  return { goals, problems, decisions, triggers };
}

function extractTopicsFromMessage(message) {
  const topics = [];
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('work') || lowerMessage.includes('job') || lowerMessage.includes('career')) topics.push('work');
  if (lowerMessage.includes('health') || lowerMessage.includes('exercise') || lowerMessage.includes('fitness')) topics.push('health');
  if (lowerMessage.includes('relationship') || lowerMessage.includes('family') || lowerMessage.includes('friend')) topics.push('relationships');
  if (lowerMessage.includes('money') || lowerMessage.includes('finance') || lowerMessage.includes('budget')) topics.push('finance');
  if (lowerMessage.includes('learn') || lowerMessage.includes('study') || lowerMessage.includes('skill')) topics.push('learning');
  
  return topics;
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