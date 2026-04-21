import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { IntentSchema, type Intent, type NavRequest } from './types.js';
import { getSkillPrompts } from './skills.js';

/**
 * Model selector. Supports three providers out of the box:
 *   - anthropic:<model>   e.g. "anthropic:claude-sonnet-4"
 *   - openai:<model>      e.g. "openai:gpt-4o-mini"
 *   - ollama:<model>      e.g. "ollama:llama3.1:8b" (runs fully local)
 * Ollama uses its OpenAI-compatible endpoint at OLLAMA_URL
 * (default http://localhost:11434/v1) so no extra dependency is needed.
 */
function resolveModel() {
  const id = process.env.OPENNAVAGENT_MODEL ?? 'anthropic:claude-sonnet-4';
  const idx = id.indexOf(':');
  const provider = idx === -1 ? id : id.slice(0, idx);
  const name = idx === -1 ? '' : id.slice(idx + 1);
  if (provider === 'anthropic') return anthropic(name || 'claude-sonnet-4');
  if (provider === 'openai') return openai(name || 'gpt-4o-mini');
  if (provider === 'ollama') {
    const ollama = createOpenAI({
      baseURL: process.env.OLLAMA_URL ?? 'http://localhost:11434/v1',
      apiKey: 'ollama',
    });
    return ollama(name || 'llama3.1:8b');
  }
  throw new Error(`Unknown provider in OPENNAVAGENT_MODEL: ${id}`);
}

function isLocalLlama(): boolean {
  return (process.env.OPENNAVAGENT_MODEL ?? '').startsWith('ollama:');
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
  (decimal degrees, 4 digits). Example: "San Francisco" → "37.7749,-122.4194".
- If it's a street address or a place you don't know precisely, output
  the name verbatim; a geocoding skill will resolve it at routing time.
- If no origin is given, use "current location".

Field rules — read carefully, smaller models forget these:

- \`avoid\`: add ANY of ["highways","tolls","ferries","traffic"] that the user
  clearly asked to avoid. Triggers: "avoid/no/without highways|freeway|toll|
  ferry|traffic|jams". If the user said none of these, return [].

- \`prefer\`: free-form strings for positive preferences. Add "scenic" for
  scenic/beautiful/pretty, "coastal" for coast/sea/beach/ocean, "quiet" for
  quiet/calm/relaxed, or any other single-word label the user clearly asked
  for. If a skill added its own triggers below, follow them. Empty [] if
  the user expressed no preference.

- \`waypoints\`: intermediate stops the user explicitly asked for, e.g.
  "stop for coffee" → ["a coffee shop"]. Empty [] otherwise.

- \`mode\`: "driving" unless the user said "walk/hike" → "walking", or
  "bike/cycle" → "cycling".`;

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
    // Smaller local models tend to ignore function-call arg descriptions
    // and fall back to defaults. Forcing strict JSON mode with the schema
    // inlined in the prompt gives noticeably better compliance.
    ...(isLocalLlama() ? { mode: 'json' as const } : {}),
  });

  return object;
}
