type VoiceIntent = {
  text: string;
  action: "none" | "create_rule" | "confirm" | "reject";
  payload?: any;
};

function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  return key;
}

export async function transcribeAudio(buffer: Buffer, mimetype: string): Promise<string> {
  const apiKey = getGroqApiKey();

  // Node.js 18+ 내장 FormData + Blob 사용 (form-data 패키지 호환 이슈 우회)
  const mime = mimetype || "audio/m4a";
  const ext = mime.includes("m4a") ? "m4a" : mime.includes("wav") ? "wav" : "webm";
  const blob = new Blob([buffer], { type: mime });

  const form = new FormData();
  form.append("file", blob, `voice.${ext}`);
  form.append("model", "whisper-large-v3");
  form.append("language", "ko");
  form.append("response_format", "json");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
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
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (anthropicKey && process.env.ANTHROPIC_ENABLED === "true") {
    // Claude로 처리 (크레딧 있을 때만)
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: anthropicKey });

    const systemPrompt = `당신은 치레(Chire)입니다. 아부지의 AI 어시스턴트. OpenMantis 에이전트 OS를 통한 음성 대화입니다.
자연스럽고 친근하게 한국어로 대답하세요. 간결하게 (2-3문장).
특수 액션이 필요하면 마지막에 [ACTION:confirm], [ACTION:reject], [ACTION:create_rule] 추가.`;

    const userContent = context
      ? `컨텍스트: ${context}\n\n사용자: ${transcript}`
      : transcript;

    const msg = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 300,
      messages: [{ role: "user", content: userContent }],
      system: systemPrompt,
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const action = text.includes("[ACTION:confirm]") ? "confirm"
      : text.includes("[ACTION:reject]") ? "reject"
      : text.includes("[ACTION:create_rule]") ? "create_rule"
      : "none";

    return {
      text: text.replace(/\[ACTION:\w+\]/g, "").trim(),
      action,
    };
  }

  // Groq 폴백
  const apiKey = getGroqApiKey();
  const userContent = context ? `Context:\n${context}\n\nTranscript:\n${transcript}` : transcript;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: '당신은 AI 어시스턴트입니다. JSON으로 응답: {"text": "응답", "action": "none"}' },
        { role: "user", content: userContent }
      ]
    })
  });

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) return { text: "죄송해요. 다시 말씀해 주세요.", action: "none" };

  try {
    return JSON.parse(rawContent) as VoiceIntent;
  } catch {
    return { text: rawContent, action: "none" };
  }
}
