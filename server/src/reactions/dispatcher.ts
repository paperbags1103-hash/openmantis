import OpenAI from "openai";
import type { AgentEvent } from "../types/event.js";
import type { Rule } from "../types/rule.js";
import { sendPush } from "./push.js";

export interface DispatchResult {
  responseText: string;
  pushed: boolean;
}

export class Dispatcher {
  private readonly client: OpenAI | null;

  constructor(
    private readonly geminiApiKey: string | undefined,
    private readonly expoPushToken: string | undefined
  ) {
    this.client = geminiApiKey
      ? new OpenAI({
          apiKey: geminiApiKey,
          baseURL: "https://api.groq.com/openai/v1",
        })
      : null;
  }

  async dispatch(rule: Rule, event: AgentEvent): Promise<DispatchResult> {
    const responseText = await this.callGemini(rule, event);

    let pushed = false;
    if (this.expoPushToken && rule.reaction.channel === "push") {
      await sendPush(
        this.expoPushToken,
        `OpenMantis: ${rule.name}`,
        responseText,
        {
          eventId: event.id,
          eventType: event.type,
          rule: rule.name,
        }
      );
      pushed = true;
    }

    return { responseText, pushed };
  }

  private async callGemini(rule: Rule, event: AgentEvent): Promise<string> {
    if (!this.client) {
      return "Gemini API key is not configured.";
    }

    const prompt = [
      `You are agent "${rule.reaction.agent}" in OpenMantis, an event-driven agent OS.`,
      `Task: ${rule.reaction.promptContext}`,
      `Triggered event: ${JSON.stringify(event, null, 2)}`,
      "Respond concisely in the same language as the task description.",
    ].join("\n\n");

    try {
      const response = await this.client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });

      return response.choices[0]?.message?.content?.trim() || "No response.";
    } catch (err) {
      console.error("[dispatcher] Gemini error:", err);
      return `Error: ${(err as Error).message}`;
    }
  }
}
