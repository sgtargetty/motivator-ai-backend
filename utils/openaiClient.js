import axios from "axios";

export async function generateMotivationalLine(task, tone, timeOfDay) {
  const prompt = `Write a short, non-repetitive motivational line (max 25 words) in a ${tone} tone for someone doing this task: "${task}" during ${timeOfDay}.`;

  console.log("🧠 Sending prompt:", prompt);

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
        temperature: 0.9
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ OpenAI success:", response.data);
    return response.data.choices[0].message.content.trim();

  } catch (error) {
    console.error("🔴 OpenAI error:", error.response?.data || error.message || error);
    throw new Error("OpenAI call failed");
  }
}
