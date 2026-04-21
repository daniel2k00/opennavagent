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

/**
 * The LLM is asked to emit coordinates directly when it knows them,
 * so the core works out-of-the-box for well-known places without a
 * geocoding skill. For exact addresses, /add-geocoding resolves them.
 */
const BASE_SYSTEM = `You are OpenNavAgent's intent parser.
Extract a structured routing intent from the user's natural-language request.
Be literal — do not invent preferences the user didn't express.

Format rules for origin/destination:
- If the user gave exact coordinates, echo them as "lat,lon".
- If it's a well-known place whose coordinates you know, output "lat,lon"
  (decimal degrees, 4 digits). Example: "Tel Aviv" → "32.0853,34.7818".
- If it's a street address or a place you don't know precisely, output
  the name verbatim; a geocoding skill will resolve it at routing time.
- If no origin is given, use "current location".`;

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
