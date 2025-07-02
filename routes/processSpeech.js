// routes/processSpeech.js - REPLACE ENTIRE FILE WITH THIS
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
  console.log("🚀🚀🚀 NEW BACKEND CODE RUNNING 🚀🚀🚀"); // ✅ This will confirm new code
  
  try {
    console.log("🎤 Processing speech file...");
    
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

    // 🔧 CRITICAL FIX: Add proper file extension for OpenAI
    console.log("🔧🔧🔧 APPLYING FILE EXTENSION FIX 🔧🔧🔧");
    
    // Determine the correct extension from the original filename
    let extension = '.m4a'; // default to m4a
    if (audioFile.originalname.endsWith('.mp3')) {
      extension = '.mp3';
      console.log("📝 Using MP3 extension");
    } else if (audioFile.originalname.endsWith('.wav')) {
      extension = '.wav';
      console.log("📝 Using WAV extension");
    } else if (audioFile.originalname.endsWith('.ogg')) {
      extension = '.ogg';
      console.log("📝 Using OGG extension");
    } else if (audioFile.originalname.endsWith('.m4a')) {
      extension = '.m4a';
      console.log("📝 Using M4A extension");
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

    // Step 1: Transcribe audio using OpenAI Whisper
    console.log("🔄 Starting transcription with properly named file...");
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(properFilePath), // ✅ Use file with proper extension
      model: "whisper-1",
      language: "en",
    });

    const transcribedText = transcription.text;
    console.log("📝 Transcribed text:", transcribedText);

    // Step 2: Extract structured data using GPT
    console.log("🤖 Extracting structured data...");
    
    const extractionPrompt = `
You are an AI assistant that extracts structured information from transcribed speech about tasks and activities. 

Analyze this transcribed text and extract the following information in JSON format:

{
  "what": "The main task or activity described",
  "when": "Time/date information mentioned (or 'Not specified' if none)",
  "where": "Location information mentioned (or 'Not specified' if none)",
  "why": "The purpose or reason mentioned (or 'Not specified' if none)",
  "how": "The method or approach mentioned (or 'Not specified' if none)"
}

Transcribed text: "${transcribedText}"

Respond with ONLY the JSON object, no additional text.`;

    const extractionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You extract structured data from speech and respond only with valid JSON." },
        { role: "user", content: extractionPrompt }
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    let extractedData;
    try {
      extractedData = JSON.parse(extractionResponse.choices[0].message.content.trim());
    } catch (parseError) {
      console.error("❌ JSON parsing error:", parseError);
      extractedData = {
        what: "Task mentioned in recording",
        when: "Not specified",
        where: "Not specified", 
        why: "Not specified",
        how: "Not specified"
      };
    }

    console.log("✅ Extracted data:", extractedData);

    // Clean up uploaded files
    console.log("🧹 Cleaning up files...");
    fs.unlinkSync(audioFile.path);
    fs.unlinkSync(properFilePath);
    console.log("🧹 Files cleaned up successfully");

    // Return complete result
    const result = {
      success: true,
      transcribedText: transcribedText,
      extractedData: extractedData,
      processing: {
        fileSize: audioFile.size,
        duration: req.body.duration || 0
      }
    };

    console.log("🎯 Sending response:", result);
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