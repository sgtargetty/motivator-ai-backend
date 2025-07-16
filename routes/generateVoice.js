import express from "express";
import { generateVoiceAudioWebSocket, generateVoiceAudio } from "../utils/elevenClient.js";
import fs from "fs";

const router = express.Router();

// In your routes/generateVoice.js, update the router.post function:

router.post("/", async (req, res) => {
  console.log("🟡 Voice Route HIT");

  const { text, voiceStyle, toneStyle } = req.body;
  console.log("📥 Request body:", req.body);
  console.log("🎵 Voice Style:", voiceStyle); // Now format: "male:Default Male"
  console.log("🎭 Tone Style:", toneStyle);

  if (!text) {
    console.log("⚠️ No 'text' field provided.");
    return res.status(400).json({ error: "Missing 'text' field in body." });
  }

  try {
    console.log("🛠 Calling ElevenLabs with voice parameters...");

    // Parse voice category and style
    let voiceCategory = 'male';
    let voiceStyleName = 'Default Male';

    if (voiceStyle && voiceStyle.includes(':')) {
      const parts = voiceStyle.split(':');
      voiceCategory = parts[0];
      voiceStyleName = parts[1];
    } else if (voiceStyle) {
      voiceStyleName = voiceStyle;
    }

    // Pass parsed parameters to the voice generation function
    const filePath = await generateVoiceAudioWebSocket(text, voiceCategory, voiceStyleName, toneStyle);
    console.log("✅ Voice generated at:", filePath);

    res.download(filePath, (err) => {
      if (err) {
        console.error("🛑 Error sending file:", err.message);
      }
      fs.unlinkSync(filePath); // cleanup
    });

  } catch (error) {
    const errorMsg = error.response?.data || error.message || error;
    console.error("🔴 ElevenLabs error full dump:", errorMsg);
    res.status(500).json({ error: "Failed to generate voice audio." });
  }
});

export default router;