import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { AgentEvent } from "../types/event.js";
import type { Rule } from "../types/rule.js";
import { parseRuleFile } from "./parser.js";

export class RuleEngine {
  private rules: Rule[] = [];

  async loadRules(dir: string): Promise<void> {
    const files = await readdir(dir);
    const yamlFiles = files.filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));
    const loaded = await Promise.all(yamlFiles.map((file) => parseRuleFile(join(dir, file))));
    this.rules = loaded;
  }

  evaluate(event: AgentEvent): Rule[] {
    return this.rules.filter((rule) => {
      if (rule.trigger.type !== event.type) {
        return false;
      }

      if (!rule.trigger.filter) {
        return true;
      }

      const haystack = JSON.stringify({
        source: event.source,
        type: event.type,
        data: event.data,
        metadata: event.metadata,
      }).toLowerCase();

      return haystack.includes(rule.trigger.filter.toLowerCase());
    });
  }
}
