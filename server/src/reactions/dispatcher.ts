import Anthropic from "@anthropic-ai/sdk";
import type { AgentEvent } from "../types/event.js";
import type { Rule } from "../types/rule.js";
import { sendPush } from "./push.js";

export interface DispatchResult {
  responseText: string;
  pushed: boolean;
}

export class Dispatcher {
  private readonly anthropic: Anthropic | null;

  constructor(
    private readonly anthropicApiKey: string | undefined,
    private readonly expoPushToken: string | undefined
  ) {
    this.anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;
  }

  async dispatch(rule: Rule, event: AgentEvent): Promise<DispatchResult> {
    const responseText = await this.callClaude(rule, event);

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

  private async callClaude(rule: Rule, event: AgentEvent): Promise<string> {
    if (!this.anthropic) {
      return "Anthropic API key is not configured.";
    }

    const prompt = [
      `You are agent \"${rule.reaction.agent}\" in OpenMantis.`,
      `Prompt context: ${rule.reaction.promptContext}`,
      `Event JSON: ${JSON.stringify(event)}`,
      "Respond briefly with the action or briefing output.",
    ].join("\n");

    const message = await this.anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((part) => part.type === "text")
      .map((part) => (part as { type: "text"; text: string }).text)
      .join("\n")
      .trim();

    return text || "No text returned from Claude.";
  }
}
