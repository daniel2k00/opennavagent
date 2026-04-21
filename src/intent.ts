import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { IntentSchema, type Intent, type NavRequest } from './types.js';
import { getSkillPrompts } from './skills.js';

function resolveModel() {
  const id = process.env.OPENNAVAGENT_MODEL ?? 'anthropic:claude-sonnet-4';
  const [provider, name] = id.split(':');
  if (provider === 'anthropic') return anthropic(name ?? 'claude-sonnet-4');
  if (provider === 'openai') return openai(name ?? 'gpt-4o-mini');
  throw new Error(`Unknown provider in OPENNAVAGENT_MODEL: ${id}`);
}

const BASE_SYSTEM = `You are OpenNavAgent's intent parser.
Extract a structured routing intent from the user's natural-language request.
Be literal — do not invent preferences the user didn't express.
If the user doesn't state an origin, use "current location".`;

/**
 * Parses free-text into a structured Intent using whichever LLM is configured.
 * Skills can inject additional instructions via getSkillPrompts().
 */
export async function parseIntent(req: NavRequest): Promise<Intent> {
  const skillPrompts = getSkillPrompts();
  const system = [BASE_SYSTEM, ...skillPrompts].join('\n\n');

  const { object } = await generateObject({
    model: resolveModel(),
    schema: IntentSchema,
    system,
    prompt: req.text,
  });

  return object;
}
