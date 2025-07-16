// 🎯 BABY STEP 1: Basic Async Queue System
// File: routes/createTaskAsync.js

import express from 'express';
import { generateMotivationalLine } from '../utils/openaiClient.js';
import { generateVoiceAudioWebSocket } from '../utils/elevenClient.js';

const router = express.Router();

// Simple in-memory queue (we'll make this fancy later)
let voiceQueue = [];
let isProcessing = false;

// 🚀 NEW ROUTE: Instant task creation (no waiting!)
router.post('/create-task', async (req, res) => {
  try {
    const {
      taskText,
      userId,
      appointmentTime,
      voiceStyle = 'Argent',
      toneStyle = 'Balanced',
      userName = 'there'
    } = req.body;

    console.log('🚀 Creating task instantly for:', userId);

    // 1. Generate motivational text quickly (1-2 seconds)
    const motivationalText = await generateMotivationalLine(taskText, toneStyle, 'evening');

    // 2. Create task ID and respond immediately
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // 3. Add voice generation to queue (doesn't block user!)
    voiceQueue.push({
      taskId,
      userId,
      taskText,
      motivationalText,
      voiceStyle,
      toneStyle,
      userName,
      status: 'pending',
      createdAt: new Date()
    });

    // 4. Start processing if not already running
    if (!isProcessing) {
      processQueue();
    }

    // 5. Return success IMMEDIATELY
    res.json({
      success: true,
      taskId,
      message: 'Task created! Your personalized audio is being prepared...',
      motivationalText,
      estimatedTime: '30-60 seconds'
    });

    console.log(`✅ Task ${taskId} created instantly! Queue size: ${voiceQueue.length}`);

  } catch (error) {
    console.error('❌ Task creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
});

// 📊 Check if audio is ready
router.get('/task-status/:taskId', (req, res) => {
  const { taskId } = req.params;
  const job = voiceQueue.find(j => j.taskId === taskId);

  if (!job) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  res.json({
    success: true,
    taskId,
    audioStatus: job.status,
    audioUrl: job.audioUrl || null
  });
});

// 🎵 Background processing (the magic happens here)
async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  console.log('🎵 Starting queue processor...');

  while (voiceQueue.length > 0) {
    const job = voiceQueue.find(j => j.status === 'pending');
    if (!job) break;

    try {
      console.log(`🎤 Processing voice for task ${job.taskId}`);
      job.status = 'processing';

      // Generate voice (this is where the magic happens)
      const audioPath = await generateVoiceAudioWebSocket(
        job.motivationalText,
        'characters',
        job.voiceStyle,
        job.toneStyle
      );

      // For now, just mark as complete (we'll add file storage later)
      job.status = 'completed';
      job.audioUrl = `https://motivator-ai-backend.onrender.com/temp/${audioPath.split('/').pop()}`;
      job.completedAt = new Date();

      console.log(`✅ Voice generated for task ${job.taskId}`);

      // Small delay to prevent overwhelming ElevenLabs
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Voice generation failed for ${job.taskId}:`, error);
      job.status = 'failed';
      job.error = error.message;
    }
  }

  isProcessing = false;
  console.log('🎯 Queue processing complete');
}

// 📊 Debug endpoint to see queue status
router.get('/queue-status', (req, res) => {
  const pending = voiceQueue.filter(j => j.status === 'pending').length;
  const processing = voiceQueue.filter(j => j.status === 'processing').length;
  const completed = voiceQueue.filter(j => j.status === 'completed').length;
  const failed = voiceQueue.filter(j => j.status === 'failed').length;

  res.json({
    success: true,
    total: voiceQueue.length,
    pending,
    processing,
    completed,
    failed,
    isProcessing
  });
});

export default router;