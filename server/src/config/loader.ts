import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dump, load } from 'js-yaml';

export interface ClaWireConfig {
  user: {
    name: string;
    timezone: string;
    locale: string;
  };
  tunnel: {
    url: string;
  };
  server: {
    port: number;
    quiet_hours_start: number;
    quiet_hours_end: number;
  };
  openclaw: {
    hooks_url: string;
    hooks_token: string;
  };
  push: {
    expo_token: string;
  };
  discord_log: {
    enabled: boolean;
    channel_id: string;
  };
  zones?: Array<{
    identifier: string;
    label: string;
    latitude: number;
    longitude: number;
    radius: number;
  }>;
}

const configPath = resolve(process.cwd(), '..', 'clawire.yaml');

function readConfigFile(): ClaWireConfig {
  if (!existsSync(configPath)) {
    throw new Error('clawire.yaml not found. Run install.sh first.');
  }

  const raw = readFileSync(configPath, 'utf8');
  const parsed = load(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('clawire.yaml is invalid.');
  }

  return parsed as ClaWireConfig;
}

export function getConfig(): ClaWireConfig {
  return readConfigFile();
}

export function saveConfig(config: ClaWireConfig): void {
  writeFileSync(configPath, dump(config, { lineWidth: 120, noRefs: true }), 'utf8');
}

export function updateConfig(mutator: (config: ClaWireConfig) => ClaWireConfig): ClaWireConfig {
  const next = mutator(readConfigFile());
  saveConfig(next);
  return next;
}
