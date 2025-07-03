// routes/processSpeech.js - COMPLETE UPGRADE: GPT-4.1 + GPT-4o Transcribe + Enhanced Date Parsing
import express from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  }
});

router.post("/", upload.single('audio'), async (req, res) => {
  console.log("🚀🚀🚀 UPGRADED AI DICTAPHONE: GPT-4.1 + GPT-4o Transcribe 🚀🚀🚀");
  
  try {
    console.log("🎤 Processing speech file with premium models...");
    
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const audioFile = req.file;
    console.log("📁 Audio file received:", {
      originalName: audioFile.originalname,
      size: audioFile.size,
      mimetype: audioFile.mimetype,
      path: audioFile.path
    });

    // 🔧 Add proper file extension for OpenAI
    console.log("🔧 Applying file extension fix...");
    
    let extension = '.m4a'; // default to m4a
    if (audioFile.originalname.endsWith('.mp3')) {
      extension = '.mp3';
    } else if (audioFile.originalname.endsWith('.wav')) {
      extension = '.wav';
    } else if (audioFile.originalname.endsWith('.ogg')) {
      extension = '.ogg';
    } else if (audioFile.originalname.endsWith('.m4a')) {
      extension = '.m4a';
    }
    
    const properFilePath = audioFile.path + extension;
    console.log(`🎯 Original file: ${audioFile.path}`);
    console.log(`🎯 New file with extension: ${properFilePath}`);
    
    // Copy the uploaded file with proper extension
    fs.copyFileSync(audioFile.path, properFilePath);
    console.log(`✅ File copied successfully: ${properFilePath}`);
    
    // Verify the new file exists
    if (fs.existsSync(properFilePath)) {
      const newFileSize = fs.statSync(properFilePath).size;
      console.log(`✅ New file verified - Size: ${newFileSize} bytes`);
    } else {
      throw new Error("Failed to create file with extension");
    }

    // 🎤 STEP 1: Transcribe audio using UPGRADED GPT-4o Transcribe
    console.log("🔄 Starting transcription with GPT-4o Transcribe (premium model)...");
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(properFilePath),
      model: "gpt-4o-transcribe", // 🚀 UPGRADED from whisper-1
      language: "en",
    });

    const transcribedText = transcription.text;
    console.log("📝 Transcribed text (GPT-4o):", transcribedText);

    // 🤖 STEP 2: Extract structured data using UPGRADED GPT-4.1 with enhanced date parsing
    console.log("🧠 Extracting structured data with GPT-4.1 (flagship model)...");
    
    // 📅 Get current date context for GPT
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }); // "Monday", "Tuesday", etc.
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format
    
    console.log(`📅 Current context: ${currentDay}, ${currentDate} ${currentTime}`);
    
    const enhancedExtractionPrompt = `
You are an AI assistant that extracts structured information from transcribed speech about tasks and activities.

IMPORTANT CONTEXT:
- Current date: ${currentDate} (${currentDay})
- Current time: ${currentTime}

Analyze this transcribed text and extract the following information in JSON format:

{
  "what": "The main task or activity described",
  "when": "PARSED_DATETIME_IN_ISO_FORMAT",
  "where": "Location information mentioned (or 'Not specified' if none)",
  "why": "The purpose or reason mentioned (or 'Not specified' if none)",
  "how": "The method or approach mentioned (or 'Not specified' if none)"
}

CRITICAL DATE PARSING RULES FOR "when" FIELD:
1. If specific date/time mentioned, convert to ISO format: "2025-08-14T15:30:00.000Z"
2. Handle natural language dates:
   - "Friday" = this coming Friday at 9:00 AM
   - "Friday at 3 PM" = this coming Friday at 3:00 PM
   - "tomorrow" = ${new Date(now.getTime() + 24*60*60*1000).toISOString().split('T')[0]}T09:00:00.000Z
   - "next week" = ${new Date(now.getTime() + 7*24*60*60*1000).toISOString().split('T')[0]}T09:00:00.000Z
   - "next month the 14th" = next month's 14th at 9:00 AM
   - "Monday morning" = this coming Monday at 9:00 AM
   - "Wednesday at 2:30" = this coming Wednesday at 2:30 PM
   - "in 2 hours" = ${new Date(now.getTime() + 2*60*60*1000).toISOString()}
   - "this afternoon" = today at 2:00 PM
   - "tonight" = today at 7:00 PM
3. If only time mentioned (e.g., "at 3 PM"), assume today if possible, otherwise tomorrow
4. Default time: 9:00 AM if no time specified
5. If no date/time info: "Not specified"

EXAMPLES:
Input: "Haircut appointment Friday at 3 PM"
Output: "when": "2025-07-04T15:00:00.000Z" (this coming Friday at 3 PM)

Input: "Dentist next month the 14th at 3:30 PM" 
Output: "when": "2025-08-14T15:30:00.000Z" (August 14th at 3:30 PM)

Input: "Meeting tomorrow morning"
Output: "when": "${new Date(now.getTime() + 24*60*60*1000).toISOString().split('T')[0]}T09:00:00.000Z"

Input: "Call mom Wednesday"
Output: "when": "2025-07-09T09:00:00.000Z" (this coming Wednesday at 9 AM)

Input: "Gym session in 2 hours"
Output: "when": "${new Date(now.getTime() + 2*60*60*1000).toISOString()}"

Transcribed text: "${transcribedText}"

Respond with ONLY the JSON object, no additional text.`;

    console.log("🧠 Sending enhanced prompt to GPT-4.1...");

    const extractionResponse = await openai.chat.completions.create({
      model: "gpt-4.1", // 🚀 UPGRADED from gpt-3.5-turbo
      messages: [
        { role: "system", content: "You extract structured data from speech and respond only with valid JSON. You are excellent at parsing natural language dates and times into ISO format." },
        { role: "user", content: enhancedExtractionPrompt }
      ],
      max_tokens: 400, // Increased for GPT-4.1
      temperature: 0.1, // Lower temperature for more consistent date parsing
    });

    let extractedData;
    try {
      extractedData = JSON.parse(extractionResponse.choices[0].message.content.trim());
      console.log("✅ Extracted data (GPT-4.1):", extractedData);
      
      // 🔍 Validate the ISO date format if provided
      if (extractedData.when && extractedData.when !== "Not specified") {
        try {
          const parsedDate = new Date(extractedData.when);
          if (isNaN(parsedDate.getTime())) {
            console.warn("⚠️ Invalid date format, using fallback");
            extractedData.when = new Date(now.getTime() + 60*60*1000).toISOString(); // 1 hour from now
          } else {
            console.log(`✅ Valid date parsed: ${parsedDate.toLocaleString()}`);
          }
        } catch (dateError) {
          console.warn("⚠️ Date validation error, using fallback");
          extractedData.when = new Date(now.getTime() + 60*60*1000).toISOString(); // 1 hour from now
        }
      }
      
    } catch (parseError) {
      console.error("❌ JSON parsing error:", parseError);
      console.error("❌ GPT-4.1 Response:", extractionResponse.choices[0].message.content);
      
      // Fallback extraction
      extractedData = {
        what: "Task mentioned in recording",
        when: "Not specified",
        where: "Not specified", 
        why: "Not specified",
        how: "Not specified"
      };
    }

    console.log("✅ Final extracted data:", extractedData);

    // Clean up uploaded files
    console.log("🧹 Cleaning up files...");
    fs.unlinkSync(audioFile.path);
    fs.unlinkSync(properFilePath);
    console.log("🧹 Files cleaned up successfully");

    // Return complete result with model info
    const result = {
      success: true,
      transcribedText: transcribedText,
      extractedData: extractedData,
      processing: {
        fileSize: audioFile.size,
        duration: req.body.duration || 0,
        currentContext: {
          date: currentDate,
          day: currentDay,
          time: currentTime
        },
        models: {
          transcription: "gpt-4o-transcribe",
          extraction: "gpt-4.1"
        }
      }
    };

    console.log("🎯 Sending premium AI response:", result);
    res.json(result);

  } catch (error) {
    console.error("🔥 Error processing speech:", error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log("🧹 Cleaned up original file");
    }
    
    // Clean up the copy with extension if it exists
    const extension = req.file?.originalname.endsWith('.mp3') ? '.mp3' :
                     req.file?.originalname.endsWith('.wav') ? '.wav' :
                     req.file?.originalname.endsWith('.ogg') ? '.ogg' : '.m4a';
    const properFilePath = req.file?.path + extension;
    if (properFilePath && fs.existsSync(properFilePath)) {
      fs.unlinkSync(properFilePath);
      console.log("🧹 Cleaned up extension file");
    }
    
    res.status(500).json({ 
      error: "Speech processing failed", 
      details: error.message 
    });
  }
});

export default router;