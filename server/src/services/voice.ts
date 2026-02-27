import FormData from "form-data";

type VoiceIntent = {
  text: string;
  action: "none" | "create_rule" | "confirm" | "reject";
  payload?: any;
};

function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return key;
}

export async function transcribeAudio(buffer: Buffer, mimetype: string): Promise<string> {
  const apiKey = getGroqApiKey();
  const form = new FormData();

  form.append("file", buffer, {
    filename: "voice-input.webm",
    contentType: mimetype || "audio/webm"
  });
  form.append("model", "whisper-large-v3");
  form.append("language", "ko");
  form.append("response_format", "json");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders()
    },
    body: form as unknown as BodyInit
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to transcribe audio (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { text?: string };
  return data.text?.trim() ?? "";
}

export async function processVoiceIntent(
  transcript: string,
  context?: string
): Promise<VoiceIntent> {
  const apiKey = getGroqApiKey();
  const systemPrompt =
    'You are OpenMantis agent. Analyze user voice input. Respond in JSON: {"text": "reply to user", "action": "none|create_rule|confirm|reject", "payload": {}}. "승인"/"확인"/"ㅇㅇ" -> confirm, "거절"/"취소"/"ㄴㄴ" -> reject, rule creation requests -> create_rule, else -> none';

  const userContent = context
    ? `Context:\n${context}\n\nTranscript:\n${transcript}`
    : transcript;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to process voice intent (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    return { text: "죄송해요. 다시 말씀해 주세요.", action: "none" };
  }

  try {
    const parsed = JSON.parse(rawContent) as VoiceIntent;
    return {
      text: parsed.text ?? "",
      action: parsed.action ?? "none",
      payload: parsed.payload
    };
  } catch {
    return { text: rawContent, action: "none" };
  }
}
