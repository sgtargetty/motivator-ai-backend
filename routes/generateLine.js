// routes/generateLine.js
import express from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  try {
    const { task, toneStyle, voiceStyle, taskType } = req.body;
    
    console.log("🎯 Received parameters:", { task, toneStyle, voiceStyle, taskType });

    // Build dynamic system prompt based on tone style
    let systemPrompt = "You are a motivational coach. ";
    
    // Build dynamic system prompt based on tone style - CLEANED
    switch(toneStyle) {
      case 'Drill Instructor':
        systemPrompt += "Be TOUGH, DIRECT, and COMMANDING! Use strong, no-nonsense military language. Push them hard! Use phrases like 'DROP AND GIVE ME 20!', 'NO EXCUSES!', 'MOVE IT!', 'RECRUIT!'. Be intense and demanding like a drill instructor!";
        break;
        
      default: // Balanced
        systemPrompt += "Be encouraging and supportive with a balanced approach. Mix motivation with practical guidance.";
    }

    // Add task type context if provided
    if (taskType) {
      switch(taskType) {
        case 'Study':
          systemPrompt += " Focus on learning, knowledge acquisition, and intellectual growth.";
          break;
        case 'Exercise':
          systemPrompt += " Focus on physical strength, endurance, and pushing physical limits.";
          break;
        case 'Work':
          systemPrompt += " Focus on productivity, career goals, and professional achievement.";
          break;
        case 'Eat':
          systemPrompt += " Focus on healthy choices, mindful eating, and nourishment.";
          break;
        case 'Sleep':
          systemPrompt += " Focus on rest, recovery, and preparing for rejuvenation.";
          break;
      }
    }

    // Add voice style influence to the content style
    if (voiceStyle) {
      // Handle combined voice styles (e.g., "characters:Lana Croft")
      const fullVoiceStyle = voiceStyle;
      const baseVoiceStyle = voiceStyle.includes(':') ? voiceStyle.split(':')[1] : voiceStyle;
      
      switch(fullVoiceStyle) {
        // 🎭 CUSTOM CHARACTER VOICES - Personality-specific prompts
        case 'characters:Lana Croft':
          systemPrompt += " Channel the spirit of a fearless adventurer! Use bold, confident language like a tomb raider who faces danger head-on. Be daring, determined, and ready for any challenge. Think 'Nothing is impossible!' and 'Adventure awaits!'";
          break;
          
        case 'characters:Baxter Jordan':
          systemPrompt += " Use analytical, methodical language with dark precision. Be calculating and thoughtful like a forensic analyst. Think step-by-step, use precise terminology, and approach motivation with scientific methodology. Be clinical but effective.";
          break;
          
        case 'characters:Argent':
          systemPrompt += " Speak like an advanced AI assistant - intelligent, sophisticated, and helpful. Use technical precision mixed with genuine care. Be like JARVIS - efficient, knowledgeable, and always ready to assist with optimal solutions.";
          break;
          
        // Existing general voice styles
        case 'Energetic':
        case 'male:Energetic Male':
        case 'female:Energetic Female':
          systemPrompt += " Use high-energy, dynamic language that sounds great when spoken with enthusiasm!";
          break;
          
        case 'Calm':
        case 'male:Calm Male':
        case 'female:Calm Female':
          systemPrompt += " Use peaceful, soothing language that sounds great when spoken calmly.";
          break;
          
        case 'Professional':
        case 'male:Professional Male':
        case 'female:Professional Female':
          systemPrompt += " Use clear, authoritative language that sounds professional and confident.";
          break;
          
        // Character-specific base personalities for existing characters
        case 'characters:Pirate Captain':
          systemPrompt += " Use adventurous, seafaring language! Talk like a pirate captain - bold, swashbuckling, and ready to conquer the seven seas!";
          break;
          
        case 'characters:Robot Assistant':
          systemPrompt += " Use logical, robotic language with efficiency and precision. Be helpful but mechanical in your approach.";
          break;
          
        case 'characters:Wizard Sage':
          systemPrompt += " Use mystical, wise language filled with ancient wisdom and magical metaphors. Speak like a powerful wizard!";
          break;
          
        case 'characters:Superhero':
          systemPrompt += " Use heroic, inspiring language! Channel the power of a superhero - be noble, strong, and ready to save the day!";
          break;
          
        case 'characters:British Butler':
          systemPrompt += " Use refined, proper English language with impeccable manners. Be sophisticated, courteous, and professionally helpful.";
          break;
          
        case 'characters:Drill Instructor':
          systemPrompt += " Use military precision and commanding language! Be like a drill sergeant - direct, powerful, and designed to push limits!";
          break;
          
        default:
          // For any other voice styles, check if it contains common keywords
          if (baseVoiceStyle?.toLowerCase().includes('energetic')) {
            systemPrompt += " Use high-energy, dynamic language that sounds great when spoken with enthusiasm!";
          } else if (baseVoiceStyle?.toLowerCase().includes('calm')) {
            systemPrompt += " Use peaceful, soothing language that sounds great when spoken calmly.";
          } else if (baseVoiceStyle?.toLowerCase().includes('professional')) {
            systemPrompt += " Use clear, authoritative language that sounds professional and confident.";
          }
          break;
      }
    }

    console.log("🎭 Using system prompt:", systemPrompt);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Motivate me for: ${task}` },
      ],
      max_tokens: 60,
      temperature: 0.8, // Add some creativity variation
    });

    const line = response.choices[0].message.content.trim();
    
    console.log("✅ Generated line:", line);
    
    res.json({ line });
  } catch (error) {
    console.error("🔥 Error in /generate-line:", error.message);
    res.status(500).json({ error: "Motivation failed. Try again." });
  }
});

export default router;