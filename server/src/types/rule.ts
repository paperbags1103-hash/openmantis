export interface RuleTrigger {
  type: string;
  condition?: string;
  filter?: string;
}

export interface RuleReaction {
  agent: string;
  approval: "auto" | "manual" | string;
  channel: "push" | "none" | string;
  promptContext: string;
}

export interface Rule {
  name: string;
  trigger: RuleTrigger;
  reaction: RuleReaction;
}
