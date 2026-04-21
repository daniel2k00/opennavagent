import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Intent } from './types.js';

/**
 * A Skill is a plugin that extends OpenNavAgent at runtime.
 *
 * Skills live in ./skills/<name>/index.ts and export a default object.
 * They are installed by Cursor/Claude commands like /add-coastal-routing
 * which copy a template into ./skills/ and register it here.
 *
 * Keep this file tiny — all the intelligence lives in individual skills.
 */
export interface Skill {
  name: string;
  /** Extra instructions injected into the intent parser's system prompt. */
  intentPrompt?: string;
  /** Mutates the Valhalla request body before it's sent. May be async. */
  transformRoute?: (request: any, intent: Intent) => any | Promise<any>;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'skills');

let loaded: Skill[] | null = null;

async function loadSkills(): Promise<Skill[]> {
  if (loaded) return loaded;
  loaded = [];

  if (!existsSync(SKILLS_DIR)) return loaded;

  for (const entry of readdirSync(SKILLS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const indexPath = join(SKILLS_DIR, entry.name, 'index.js');
    if (!existsSync(indexPath)) continue;
    const mod = await import(pathToFileURL(indexPath).href);
    if (mod.default) loaded.push(mod.default as Skill);
  }

  return loaded;
}

await loadSkills();

export function getSkillPrompts(): string[] {
  return (loaded ?? []).flatMap((s) => (s.intentPrompt ? [s.intentPrompt] : []));
}

export async function applyPlannerSkills(request: any, intent: Intent): Promise<any> {
  let out = request;
  for (const s of loaded ?? []) {
    if (s.transformRoute) out = await s.transformRoute(out, intent);
  }
  return out;
}

export function listSkills(): string[] {
  return (loaded ?? []).map((s) => s.name);
}
