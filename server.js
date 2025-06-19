import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import generateLine from "./routes/generateLine.js";
import generateVoice from "./routes/generateVoice.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("✅ Motivator.AI backend is alive!");
});
app.use("/generate-line", generateLine);
app.use("/generate-voice", generateVoice);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is now actively listening on http://0.0.0.0:${PORT}`);
});
app.get("/test", (req, res) => {
  res.send("🧪 Test endpoint reached successfully");
});

console.log("🧪 End of server.js reached");


