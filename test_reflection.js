// test_reflection.js - Test the new reflection API
import axios from 'axios';

const API_BASE = 'https://motivator-ai-backend.onrender.com'; // Production URL // Update to your backend URL
// For production: 'https://motivator-ai-backend.onrender.com'

async function testReflectionAPI() {
  console.log("🎭 Testing Smart AI Reflection System...\n");

  // Test cases for different task types
  const testCases = [
    {
      name: "Medical Appointment",
      data: {
        taskId: "task_001",
        taskType: "medical",
        taskDescription: "VA appointment for back pain check",
        scheduledTime: "2025-07-03T14:00:00.000Z",
        completionTime: "2025-07-03T15:30:00.000Z",
        userTimezone: "EDT",
        userContext: {
          previousReflections: 3,
          completionPattern: "usually completes on time",
          preferredStyle: "supportive"
        }
      }
    },
    {
      name: "Work Meeting",
      data: {
        taskId: "task_002", 
        taskType: "work",
        taskDescription: "Team standup meeting",
        scheduledTime: "2025-07-03T09:00:00.000Z",
        userTimezone: "EDT",
        reflectionTrigger: "scheduled"
      }
    },
    {
      name: "Gym Workout",
      data: {
        taskId: "task_003",
        taskType: "exercise", 
        taskDescription: "Leg day workout at the gym",
        scheduledTime: "2025-07-03T07:00:00.000Z",
        userTimezone: "EDT",
        userContext: {
          previousReflections: 0,
          completionPattern: "new user"
        }
      }
    },
    {
      name: "Creative Project",
      data: {
        taskId: "task_004",
        taskType: "creative",
        taskDescription: "Work on painting landscape piece",
        scheduledTime: "2025-07-03T19:00:00.000Z", 
        userTimezone: "EDT"
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log("=" .repeat(50));
    
    try {
      const response = await axios.post(
        `${API_BASE}/generate-reflection`,
        testCase.data,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.status === 200 && response.data.success) {
        const reflection = response.data.reflection;
        
        console.log("✅ SUCCESS!");
        console.log(`📋 Category: ${reflection.category}`);
        console.log(`🎯 Reflection ID: ${reflection.reflectionId}`);
        console.log(`❓ Primary Question: "${reflection.questions[0].text}"`);
        console.log(`🎤 Voice Version: "${reflection.questions[0].voiceText}"`);
        console.log(`🎭 Tone: ${reflection.questions[0].tone}`);
        console.log(`✅ Completion Prompt: "${reflection.completionPrompt.text}"`);
        console.log(`💪 Positive Response: "${reflection.motivationalResponse.positive}"`);
        
        if (reflection.questions.length > 1) {
          console.log(`🔄 Follow-ups: ${reflection.questions.length - 1} additional questions`);
        }
        
      } else {
        console.log("❌ FAILED: Invalid response structure");
        console.log("Response:", response.data);
      }
      
    } catch (error) {
      console.log("❌ ERROR:", error.message);
      
      if (error.response) {
        console.log("Status:", error.response.status);
        console.log("Data:", error.response.data);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎭 Reflection API Testing Complete!");
  console.log("=".repeat(60));
}

// Error handling test
async function testErrorHandling() {
  console.log("\n🚨 Testing Error Handling...");
  
  try {
    // Test with missing required fields
    const response = await axios.post(
      `${API_BASE}/generate-reflection`,
      { taskId: "", taskDescription: "" }, // Invalid data
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log("❌ Should have failed but didn't");
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log("✅ Error handling works correctly");
      console.log("Error message:", error.response.data.error);
    } else {
      console.log("❌ Unexpected error:", error.message);
    }
  }
}

// Run tests
async function runAllTests() {
  console.log("🚀 Starting Mission 2 API Tests...\n");
  
  await testReflectionAPI();
  await testErrorHandling();
  
  console.log("\n🎉 All tests completed! Mission 2 backend is ready!");
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { testReflectionAPI, testErrorHandling, runAllTests };