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
    
    switch(toneStyle) {
      case 'Drill Sergeant':
        systemPrompt += "Be TOUGH, DIRECT, and COMMANDING! Use strong, no-nonsense language. Push them hard! Use phrases like 'DROP AND GIVE ME 20!', 'NO EXCUSES!', 'MOVE IT!'. Be intense and demanding!";
        break;
        
      case 'Cheerleader':
        systemPrompt += "Be EXTREMELY positive, enthusiastic, and encouraging! Use lots of exclamation points and energy! Say things like 'You've got this!', 'Amazing!', 'Go team YOU!'. Be bubbly and supportive!";
        break;
        
      case 'Sage':
        systemPrompt += "Be wise, calm, and philosophical. Provide thoughtful, deep insights. Use metaphors and wisdom. Speak like a wise mentor with profound understanding.";
        break;
        
      case 'Coach':
        systemPrompt += "Be supportive but goal-focused. Help them break down challenges into manageable steps. Be like a sports coach - firm but encouraging, strategic and motivating.";
        break;
        
      case 'Friend':
        systemPrompt += "Be casual, warm, and encouraging like a best friend. Use friendly, conversational language. Be supportive and understanding while keeping them motivated.";
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
      switch(voiceStyle) {
        case 'Energetic':
          systemPrompt += " Use high-energy, dynamic language that sounds great when spoken with enthusiasm!";
          break;
        case 'Calm':
          systemPrompt += " Use peaceful, soothing language that sounds great when spoken calmly.";
          break;
        case 'Professional':
          systemPrompt += " Use clear, authoritative language that sounds professional and confident.";
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