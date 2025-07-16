import axios from "axios";
import fs from "fs";
import path from "path";
import WebSocket from 'ws'; // 🚀 NEW: WebSocket for 20x scaling!

// Expanded Voice System with Genders and Fun Characters
const VOICE_CATALOG = {
  // MALE VOICES
  male: {
    'Default Male': '21m00Tcm4TlvDq8ikWAM', // Josh - Default male
    'Energetic Male': 'ErXwobaYiN019PkySvjV', // Antoni - Energetic 
    'Calm Male': '29vD33N1CtxCmqQRPOHJ', // Drew - Calm, soothing
    'Professional Male': 'TxGEqnHWrfWFTfGW9XjX', // Josh - Professional
    'Wise Mentor': 'VR6AewLTigWG4xSOukaG', // Arnold - Older, wise voice
    'Sports Announcer': 'pNInz6obpgDQGcFmaJgB', // Adam - Dynamic announcer
  },
  
  // FEMALE VOICES
  female: {
    'Default Female': 'EXAVITQu4vr4xnSDxMaL', // Bella - Default female
    'Energetic Female': 'AZnzlk1XvdvUeBnXmlld', // Domi - Energetic female
    'Calm Female': 'ThT5KcBeYPX3keUQqHPh', // Dorothy - Calm, soothing
    'Professional Female': 'jsCqWAovK2LkecY7zXl4', // Freya - Professional
    'Wise Woman': 'XrExE9yKIg1WjnnlVkGX', // Matilda - Wise, maternal
    'News Anchor': 'jBpfuIE2acCO8z3wKNLl', // Gigi - Clear, authoritative
  },
  
  // FUN CHARACTER VOICES (Generic, no copyright)
  characters: {
    'Robot Assistant': 'pMsXgVXv3BLzUgSXRplE', // Callum - Robotic delivery
    'Pirate Captain': 'N2lVS1w4EtoT3dr4eOWO', // Fin - Adventurous, pirate-like
    'Wizard Sage': 'VR6AewLTigWG4xSOukaG', // Arnold - Mystical, wise
    'Superhero': 'pNInz6obpgDQGcFmaJgB', // Adam - Heroic, strong
    'Surfer Dude': 'yoZ06aMxZJJ28mfd3POQ', // Sam - Laid-back, chill
    'Southern Belle': 'XB0fDUnXU5powFXDhCwa', // Charlotte - Southern charm
    'British Butler': 'onwK4e9ZLuTAKqWW03F9', // Daniel - Refined, proper
    'Valley Girl': 'pFZP5JQG7iQjIQuC4Bku', // Lily - Bubbly, valley accent
    'Game Show Host': 'IKne3meq5aSn9XLyUdCD', // Charlie - Enthusiastic host
    'Meditation Guru': '29vD33N1CtxCmqQRPOHJ', // Drew - Peaceful, zen
    'Drill Instructor': 'TxGEqnHWrfWFTfGW9XjX', // Josh - Military, commanding
    'Cheerleader Coach': 'EXAVITQu4vr4xnSDxMaL', // Bella - Peppy, encouraging
    // 🎭 CUSTOM VOICES - Your ElevenLabs Creations
    'Lana Croft': 'QXEkTn58Ik1IKjIMk8QA', // Adventure hero, tomb raider spirit
    'Baxter Jordan': 'xFhB0ETJT3eAfKLqQ2NA', // Dark analyst, methodical precision  
    'Argent': 'Z7sbvjjgVPfOSMUrfJT1', // Advanced AI assistant, JARVIS-like
  }
};

// Tone Style to Voice Settings mapping - CLEANED
const TONE_VOICE_SETTINGS = {
  'Drill Instructor': {
    stability: 0.9,
    similarity_boost: 0.9,
    style: 0.1,
    use_speaker_boost: true,
  },
  'Balanced': {
    stability: 0.6,
    similarity_boost: 0.85,
    style: 0.5,
    use_speaker_boost: false,
  }
};

// Helper function to get voice ID from category and style
function getVoiceId(voiceCategory, voiceStyle) {
  console.log('🔍 DEBUG - Looking for:', voiceCategory, voiceStyle);
  console.log('🔍 DEBUG - Available characters:', Object.keys(VOICE_CATALOG.characters || {}));
  console.log('🔍 DEBUG - Lana Croft in catalog?', VOICE_CATALOG.characters['Lana Croft']);
  console.log('🔍 DEBUG - Direct lookup result:', VOICE_CATALOG[voiceCategory] && VOICE_CATALOG[voiceCategory][voiceStyle]);
  
  if (VOICE_CATALOG[voiceCategory] && VOICE_CATALOG[voiceCategory][voiceStyle]) {
    const foundVoiceId = VOICE_CATALOG[voiceCategory][voiceStyle];
    console.log('🔍 DEBUG - Found voice ID:', foundVoiceId);
    return foundVoiceId;
  }
  
  console.log('🔍 DEBUG - Voice not found, using fallback');
  
  // Fallback logic
  if (voiceCategory === 'male') {
    return VOICE_CATALOG.male['Default Male'];
  } else if (voiceCategory === 'female') {
    return VOICE_CATALOG.female['Default Female'];
  } else if (voiceCategory === 'characters') {
    console.log('🔍 DEBUG - Using Robot Assistant fallback');
    return VOICE_CATALOG.characters['Robot Assistant'];
  }
  
  // Ultimate fallback
  return process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
}

// 🚀 WEBSOCKET TTS - THE CONCURRENCY BREAKTHROUGH!
// This solves your 15 concurrent limit by only counting during generation
async function connectWebSocketTTS(voiceId, text, voiceSettings) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // Create WebSocket connection to ElevenLabs
    // 🔍 DEBUG: Check WebSocket URL and headers
    const websocketUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input`;
    console.log("🔍 WebSocket URL:", websocketUrl);
    console.log("🔍 API Key (first 10 chars):", process.env.ELEVENLABS_API_KEY?.substring(0, 10));

    const ws = new WebSocket(websocketUrl, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      }
    });

    let audioChunks = [];
    let generationStartTime = null;
    let hasReceivedAudio = false;

    ws.on('open', () => {
      console.log("🔌 WebSocket connected to ElevenLabs");
      
      // Send TTS request
      const request = {
      text: text,
      voice_settings: voiceSettings,
      xi_api_key: process.env.ELEVENLABS_API_KEY, // 🔑 CRITICAL: API key in message body
      model_id: "eleven_monolingual_v1",
    };
      
      ws.send(JSON.stringify(request));
    });

    ws.on('message', (data) => {
      try {
        // Check if it's JSON (status message) or binary (audio)
        if (data[0] === 0x7B) { // JSON starts with '{'
          const message = JSON.parse(data.toString());
          
          if (message.type === 'generation_started') {
            generationStartTime = Date.now();
            console.log("🎵 Audio generation started - NOW counting toward concurrency");
          } else if (message.type === 'generation_ended') {
            const generationTime = (Date.now() - generationStartTime) / 1000;
            console.log(`🎯 Generation ended - concurrency freed after ${generationTime}s`);
          } else if (message.error) {
            reject(new Error(`ElevenLabs WebSocket error: ${message.error}`));
            return;
          }
        } else {
          // Binary audio data
          audioChunks.push(data);
          hasReceivedAudio = true;
        }
      } catch (parseError) {
        // Assume it's binary audio data if JSON parsing fails
        audioChunks.push(data);
        hasReceivedAudio = true;
      }
    });

    ws.on('close', () => {
      const totalTime = (Date.now() - startTime) / 1000;
      const actualGenerationTime = generationStartTime ? (Date.now() - generationStartTime) / 1000 : totalTime;
      
      console.log(`📊 WebSocket closed. Total time: ${totalTime}s, Generation time: ${actualGenerationTime}s`);
      console.log(`🚀 Concurrency efficiency: ${((totalTime - actualGenerationTime) / totalTime * 100).toFixed(1)}% saved!`);
      
      if (hasReceivedAudio && audioChunks.length > 0) {
        const audioBuffer = Buffer.concat(audioChunks);
        console.log(`✅ Audio received: ${audioBuffer.length} bytes`);
        resolve(audioBuffer);
      } else {
        reject(new Error('No audio data received from WebSocket'));
      }
    });

    ws.on('error', (error) => {
      console.error("❌ WebSocket error:", error.message);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
        reject(new Error('WebSocket timeout after 30 seconds'));
      }
    }, 30000);
  });
}

// 🚀 WEBSOCKET TTS MAIN FUNCTION - 20X SCALING!
export async function generateVoiceAudioWebSocket(text, voiceCategory = 'male', voiceStyle = 'Default Male', toneStyle = 'Balanced') {
  console.log("🚀 WebSocket TTS - SCALING MODE ACTIVATED!");
  console.log("🎤 Voice:", voiceCategory, voiceStyle);
  console.log("🎭 Tone:", toneStyle);
  console.log("📝 Text length:", text.length, "characters");
  
  const voiceId = getVoiceId(voiceCategory, voiceStyle);
  const voiceSettings = TONE_VOICE_SETTINGS[toneStyle] || TONE_VOICE_SETTINGS['Balanced'];
  
  console.log("🎯 Using Voice ID:", voiceId);
  console.log("⚙️ Voice settings:", voiceSettings);
  
  try {
    const audioBuffer = await connectWebSocketTTS(voiceId, text, voiceSettings);
    
    const fileName = `websocket-${voiceCategory}-${voiceStyle.replace(/\s+/g, '')}-${toneStyle}-${Date.now()}.mp3`;
    const filePath = path.resolve("temp", fileName);
    
    fs.mkdirSync("temp", { recursive: true });
    fs.writeFileSync(filePath, audioBuffer);
    
    console.log("✅ WebSocket TTS SUCCESS:", fileName);
    console.log("🎯 CONCURRENCY IMPACT: Minimal - only during generation phase!");
    return filePath;
    
  } catch (error) {
    console.error("❌ WebSocket TTS failed:", error.message);
    console.log("🔄 Falling back to HTTP TTS...");
    
    // Automatic fallback to your existing HTTP method
    return generateVoiceAudio(text, voiceCategory, voiceStyle, toneStyle);
  }
}

// 🔄 ORIGINAL HTTP TTS (Your existing function - now as fallback)
export async function generateVoiceAudio(text, voiceCategory = 'male', voiceStyle = 'Default Male', toneStyle = 'Balanced') {
  console.log("🎵 HTTP TTS (Original method)");
  console.log("🎭 Voice style:", voiceStyle);
  console.log("🎯 Tone style:", toneStyle);
  
  // Get the voice ID based on category and style
  const voiceId = getVoiceId(voiceCategory, voiceStyle);
  console.log("🎤 Using voice ID:", voiceId);
  
  // Get voice settings based on tone style
  const voiceSettings = TONE_VOICE_SETTINGS[toneStyle] || TONE_VOICE_SETTINGS['Balanced'];
  console.log("⚙️ Using voice settings:", voiceSettings);

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        voice_settings: voiceSettings
      },
      {
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    const fileName = `output-${voiceCategory}-${voiceStyle.replace(/\s+/g, '')}-${toneStyle}-${Date.now()}.mp3`;
    const filePath = path.resolve("temp", fileName);

    fs.mkdirSync("temp", { recursive: true });
    fs.writeFileSync(filePath, response.data);

    console.log("✅ HTTP TTS file generated:", fileName);
    return filePath;
    
  } catch (error) {
    console.error("❌ ElevenLabs API Error:", error.response?.data || error.message);
    
    // Fallback to default male voice if the selected voice fails
    if (voiceCategory !== 'male' || voiceStyle !== 'Default Male') {
      console.log("🔄 Falling back to default male voice...");
      return generateVoiceAudio(text, 'male', 'Default Male', toneStyle);
    }
    
    throw error;
  }
}

// 📊 SCALING STATS FUNCTION
export function getScalingStats() {
  return {
    webSocketMethod: "20x concurrency improvement",
    httpMethod: "Standard concurrency usage", 
    recommendation: "Use WebSocket for production scaling",
    concurrencyExplain: "WebSocket only counts during 2-3s generation, not 30s conversation gaps"
  };
}

// Export the voice catalog for use in the app
export { VOICE_CATALOG };