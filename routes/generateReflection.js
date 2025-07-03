// routes/generateReflection.js - Mission 2: Smart AI Reflection System
import express from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  console.log("🎭🚀🚀 MISSION 2: SMART AI REFLECTION SYSTEM 🚀🚀🎭");
  
  try {
    const { 
      taskId, 
      taskType, 
      taskDescription, 
      scheduledTime,
      completionTime,
      userContext = {},
      userTimezone = 'UTC',
      reflectionTrigger = 'scheduled' // 'scheduled', 'manual', 'reminder'
    } = req.body;

    console.log("🎯 Generating reflection for task:", {
      taskId,
      taskType,
      taskDescription,
      scheduledTime,
      completionTime,
      userTimezone,
      reflectionTrigger
    });

    // Validate required fields
    if (!taskId || !taskDescription) {
      return res.status(400).json({ 
        error: "Missing required fields: taskId and taskDescription" 
      });
    }

    // 📅 Calculate timing context
    const now = new Date();
    const scheduled = scheduledTime ? new Date(scheduledTime) : null;
    const completed = completionTime ? new Date(completionTime) : null;
    
    let timingContext = '';
    if (scheduled) {
      const hoursAfter = completed ? 
        Math.round((completed.getTime() - scheduled.getTime()) / (1000 * 60 * 60) * 10) / 10 :
        Math.round((now.getTime() - scheduled.getTime()) / (1000 * 60 * 60) * 10) / 10;
      
      if (hoursAfter < 0) {
        timingContext = `Task was scheduled for ${Math.abs(hoursAfter)} hours from now`;
      } else if (hoursAfter < 1) {
        timingContext = `Task was ${Math.round(hoursAfter * 60)} minutes ago`;
      } else {
        timingContext = `Task was ${hoursAfter} hours ago`;
      }
    }

    // 🧠 Determine task category for contextual responses
    const taskCategory = determineTaskCategory(taskDescription, taskType);
    console.log("📋 Task category:", taskCategory);

    // 🎭 Build intelligent reflection prompt
    const reflectionPrompt = `
You are a caring AI companion helping users reflect on their completed tasks. Your goal is to generate thoughtful, contextual reflection questions that:

1. Show genuine interest in their experience
2. Encourage honest self-reflection
3. Celebrate successes and provide support for challenges
4. Build positive completion habits
5. Adapt to the specific task type and context

TASK CONTEXT:
- Task ID: ${taskId}
- Category: ${taskCategory.category}
- Description: "${taskDescription}"
- Timing: ${timingContext}
- User Timezone: ${userTimezone}
- Trigger: ${reflectionTrigger}

USER CONTEXT:
- Previous reflections: ${userContext.previousReflections?.length || 0}
- Completion pattern: ${userContext.completionPattern || 'new user'}
- Preferred style: ${userContext.preferredStyle || 'balanced'}

REFLECTION GUIDELINES:
${taskCategory.guidelines}

Generate a JSON response with this structure:
{
  "reflectionId": "unique_identifier",
  "category": "${taskCategory.category}",
  "questions": [
    {
      "id": "primary",
      "type": "primary",
      "text": "Main reflection question for display",
      "voiceText": "Natural, conversational version for voice interaction",
      "tone": "supportive|celebratory|curious|encouraging",
      "expectedResponses": ["great", "okay", "challenging", "mixed"]
    },
    {
      "id": "followup_positive", 
      "type": "follow_up",
      "text": "Follow-up for positive responses",
      "condition": "if_primary_positive",
      "voiceText": "Voice version of follow-up"
    },
    {
      "id": "followup_negative",
      "type": "follow_up", 
      "text": "Follow-up for challenging responses",
      "condition": "if_primary_negative",
      "voiceText": "Voice version with support"
    }
  ],
  "completionPrompt": {
    "text": "Should I mark this task as completed?",
    "voiceText": "Would you like me to mark this as done?",
    "autoSuggest": true
  },
  "motivationalResponse": {
    "positive": "Celebration message for good experiences",
    "negative": "Supportive message for challenges",
    "completion": "Encouragement for task completion"
  },
  "insights": {
    "pattern": "Behavioral pattern observation",
    "suggestion": "Personalized suggestion for future tasks"
  }
}

Generate natural, human-like questions that make the user feel heard and supported. Avoid clinical or robotic language.
`;

    console.log("🧠 Sending reflection prompt to GPT-4.1...");

    const reflectionResponse = await openai.chat.completions.create({
      model: "gpt-4.1", // 🚀 Using flagship model for emotional intelligence
      messages: [
        { 
          role: "system", 
          content: "You are an empathetic AI assistant specialized in creating caring, contextual reflection experiences. You understand human emotions and generate thoughtful questions that help users process their experiences. Always respond with valid JSON only."
        },
        { role: "user", content: reflectionPrompt }
      ],
      max_tokens: 800, // Increased for comprehensive reflection data
      temperature: 0.7, // Balanced creativity for natural conversation
    });

    let reflectionData;
    try {
      const rawResponse = reflectionResponse.choices[0].message.content.trim();
      console.log("🎭 Raw GPT-4.1 reflection response:", rawResponse);
      
      reflectionData = JSON.parse(rawResponse);
      
      // Add server-generated metadata
      reflectionData.reflectionId = `refl_${taskId}_${Date.now()}`;
      reflectionData.generatedAt = now.toISOString();
      reflectionData.taskContext = {
        taskId,
        taskDescription,
        scheduledTime,
        timingContext,
        category: taskCategory.category
      };
      
      console.log("✅ Reflection data generated successfully!");
      
    } catch (parseError) {
      console.error("❌ JSON parsing error for reflection:", parseError);
      console.error("❌ GPT-4.1 Response:", reflectionResponse.choices[0].message.content);
      
      // 🆘 Fallback reflection for parsing failures
      reflectionData = createFallbackReflection(taskId, taskDescription, taskCategory);
    }

    // 🎯 Return complete reflection response
    const result = {
      success: true,
      reflection: reflectionData,
      processing: {
        model: "gpt-4.1",
        taskCategory: taskCategory.category,
        timingContext,
        generatedAt: now.toISOString()
      }
    };

    console.log("🎭 Sending intelligent reflection response");
    res.json(result);

  } catch (error) {
    console.error("🔥 Error generating reflection:", error);
    res.status(500).json({ 
      error: "Failed to generate reflection",
      details: error.message 
    });
  }
});

// 🧠 Task category determination with context-specific guidelines
function determineTaskCategory(description, taskType) {
  const desc = description.toLowerCase();
  
  // Medical/Health category
  if (desc.includes('doctor') || desc.includes('dentist') || desc.includes('appointment') || 
      desc.includes('medical') || desc.includes('therapy') || desc.includes('checkup') ||
      desc.includes('va ') || taskType === 'medical') {
    return {
      category: 'medical',
      guidelines: `
- Show empathy and care for health-related experiences
- Ask about comfort level, information received, next steps
- Celebrate taking care of their health
- Offer support if the experience was challenging
- Focus on their wellbeing and self-care`
    };
  }
  
  // Work/Professional category
  if (desc.includes('meeting') || desc.includes('work') || desc.includes('presentation') || 
      desc.includes('interview') || desc.includes('conference') || taskType === 'work') {
    return {
      category: 'professional',
      guidelines: `
- Focus on professional growth and achievement
- Ask about outcomes, learnings, networking opportunities
- Celebrate career progress and professional development
- Encourage reflection on skills used and gained
- Support work-life balance considerations`
    };
  }
  
  // Learning/Education category  
  if (desc.includes('study') || desc.includes('learn') || desc.includes('course') || 
      desc.includes('class') || desc.includes('exam') || taskType === 'study') {
    return {
      category: 'learning',
      guidelines: `
- Encourage intellectual curiosity and growth mindset
- Ask about insights gained, concepts mastered, challenges overcome
- Celebrate learning achievements and knowledge acquisition
- Support the learning process with encouragement
- Focus on long-term educational goals`
    };
  }
  
  // Fitness/Exercise category
  if (desc.includes('gym') || desc.includes('workout') || desc.includes('exercise') || 
      desc.includes('run') || desc.includes('yoga') || taskType === 'exercise') {
    return {
      category: 'fitness',
      guidelines: `
- Celebrate physical achievement and commitment to health
- Ask about energy levels, how their body feels, goals met
- Encourage consistency and progress over perfection
- Support their fitness journey with positive reinforcement
- Focus on strength, endurance, and overall wellbeing`
    };
  }
  
  // Personal/Relationships category
  if (desc.includes('family') || desc.includes('friend') || desc.includes('call') || 
      desc.includes('visit') || desc.includes('date') || taskType === 'personal') {
    return {
      category: 'personal',
      guidelines: `
- Focus on relationships, connections, and emotional wellbeing
- Ask about quality time spent, feelings shared, bonds strengthened
- Celebrate meaningful connections and personal growth
- Support emotional experiences with empathy and understanding
- Encourage reflection on relationships and personal values`
    };
  }
  
  // Creative/Hobbies category
  if (desc.includes('paint') || desc.includes('write') || desc.includes('create') || 
      desc.includes('music') || desc.includes('hobby') || taskType === 'creative') {
    return {
      category: 'creative',
      guidelines: `
- Celebrate creative expression and artistic achievement
- Ask about inspiration, creative flow, satisfaction with output
- Encourage artistic growth and creative exploration
- Support the creative process with enthusiasm
- Focus on self-expression and creative fulfillment`
    };
  }
  
  // Default general category
  return {
    category: 'general',
    guidelines: `
- Show genuine interest in their experience
- Ask open-ended questions about how it went
- Celebrate completion and effort invested
- Provide balanced support for any challenges
- Encourage reflection on learnings and next steps`
  };
}

// 🆘 Fallback reflection when AI parsing fails
function createFallbackReflection(taskId, taskDescription, taskCategory) {
  return {
    reflectionId: `refl_${taskId}_${Date.now()}`,
    category: taskCategory.category,
    questions: [
      {
        id: "primary",
        type: "primary", 
        text: `How did your ${taskDescription} go?`,
        voiceText: `Hey! I noticed you had "${taskDescription}" scheduled. How did it go?`,
        tone: "curious",
        expectedResponses: ["great", "okay", "challenging", "mixed"]
      },
      {
        id: "followup_positive",
        type: "follow_up",
        text: "That's wonderful! What made it go so well?",
        condition: "if_primary_positive",
        voiceText: "That's fantastic! Tell me what made it such a positive experience."
      },
      {
        id: "followup_negative", 
        type: "follow_up",
        text: "I'm sorry it was challenging. Is there anything that could help next time?",
        condition: "if_primary_negative",
        voiceText: "I hear that it was tough. Sometimes these things are challenging, and that's completely normal. Is there anything that might help make it easier next time?"
      }
    ],
    completionPrompt: {
      text: "Should I mark this task as completed?",
      voiceText: "Would you like me to mark this as done?",
      autoSuggest: true
    },
    motivationalResponse: {
      positive: "I'm so proud of you for following through! Taking action on your commitments shows real strength.",
      negative: "You showed up and tried, and that takes courage. Every experience teaches us something valuable.",
      completion: "Another task completed! You're building great habits and making real progress."
    },
    insights: {
      pattern: "Continuing to build positive completion habits",
      suggestion: "Keep maintaining this momentum with your scheduled tasks"
    }
  };
}

export default router;