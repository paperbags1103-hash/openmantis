import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { z } from "zod";
import type { Rule } from "../types/rule.js";

const RuleSchema = z.object({
  name: z.string().min(1),
  trigger: z.object({
    type: z.string().min(1),
    condition: z.string().optional(),
    filter: z.string().optional(),
  }),
  reaction: z.object({
    agent: z.string().min(1),
    approval: z.string().min(1),
    channel: z.string().min(1),
    promptContext: z.string().min(1),
  }),
});

export async function parseRuleFile(filePath: string): Promise<Rule> {
  const content = await readFile(filePath, "utf8");
  const parsed = YAML.parse(content);
  return RuleSchema.parse(parsed) as Rule;
}
