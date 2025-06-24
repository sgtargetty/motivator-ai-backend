import axios from "axios";
import fs from "fs";
import path from "path";

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

// Tone Style to Voice Settings mapping (enhanced)
const TONE_VOICE_SETTINGS = {
  'Drill Sergeant': {
    stability: 0.9,
    similarity_boost: 0.9,
    style: 0.1,
    use_speaker_boost: true,
  },
  'Cheerleader': {
    stability: 0.3,
    similarity_boost: 0.7,
    style: 0.9,
    use_speaker_boost: true,
  },
  'Sage': {
    stability: 0.8,
    similarity_boost: 0.8,
    style: 0.2,
    use_speaker_boost: false,
  },
  'Coach': {
    stability: 0.7,
    similarity_boost: 0.8,
    style: 0.5,
    use_speaker_boost: true,
  },
  'Friend': {
    stability: 0.5,
    similarity_boost: 0.7,
    style: 0.7,
    use_speaker_boost: false,
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

export async function generateVoiceAudio(text, voiceCategory = 'male', voiceStyle = 'Default Male', toneStyle = 'Balanced') {
  console.log("🎵 Generating voice with category:", voiceCategory);
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

    console.log("✅ Voice file generated:", fileName);
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

// Export the voice catalog for use in the app
export { VOICE_CATALOG };