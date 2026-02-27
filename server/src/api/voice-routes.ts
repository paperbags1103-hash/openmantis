import { Router } from "express";
import { processVoiceIntent, transcribeAudio } from "../services/voice.js";

export function createVoiceRouter(): Router {
  const router = Router();

  // base64 JSON 방식 (React Native FormData 호환 이슈 우회)
  router.post("/api/voice/transcribe", async (req, res) => {
    try {
      const { audio, mimeType } = req.body ?? {};
      if (!audio) return res.status(400).json({ error: "Audio file is required" });
      const buffer = Buffer.from(audio, "base64");
      const transcript = await transcribeAudio(buffer, mimeType ?? "audio/m4a");
      return res.json({ transcript });
    } catch (error) {
      console.error("Voice transcribe error", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown" });
    }
  });

  router.post("/api/voice/chat", async (req, res) => {
    try {
      const { audio, mimeType, context } = req.body ?? {};
      if (!audio) return res.status(400).json({ error: "Audio file is required" });
      const buffer = Buffer.from(audio, "base64");
      const transcript = await transcribeAudio(buffer, mimeType ?? "audio/m4a");
      const response = await processVoiceIntent(transcript, context);
      return res.json({ transcript, response });
    } catch (error) {
      console.error("Voice chat error", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown" });
    }
  });

  return router;
}
