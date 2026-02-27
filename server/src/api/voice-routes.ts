import { Router } from "express";
import multer from "multer";
import { processVoiceIntent, transcribeAudio } from "../services/voice.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

export function createVoiceRouter(): Router {
  const router = Router();

  router.post("/api/voice/transcribe", upload.single("audio"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "Audio file is required" });
      }

      const transcript = await transcribeAudio(file.buffer, file.mimetype);
      return res.json({ transcript });
    } catch (error) {
      console.error("Voice transcribe error", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });

  router.post("/api/voice/chat", upload.single("audio"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "Audio file is required" });
      }

      const context = typeof req.body?.context === "string" ? req.body.context : undefined;
      const transcript = await transcribeAudio(file.buffer, file.mimetype);
      const response = await processVoiceIntent(transcript, context);

      return res.json({ transcript, response });
    } catch (error) {
      console.error("Voice chat error", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });

  return router;
}
