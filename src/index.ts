import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { parseIntent } from './intent.js';
import { planRoute } from './planner.js';
import { listSkills, listSkillsDetailed } from './skills.js';
import { ensureValhalla, isValhallaReady } from './container.js';
import type { NavRequest, NavResponse } from './types.js';

/**
 * OpenNavAgent orchestrator.
 *
 * Flow: text → parseIntent() → planRoute() → response.
 * That's it. Everything else is a skill.
 */
export async function navigate(req: NavRequest): Promise<NavResponse> {
  const intent = await parseIntent(req);
  const route = await planRoute(intent, req.context?.currentLocation);

  const explanation =
    `Heading from ${intent.origin} to ${intent.destination}. ` +
    `${route.summary}.` +
    (intent.avoid.length ? ` Avoiding: ${intent.avoid.join(', ')}.` : '') +
    (intent.prefer.length ? ` Preferring: ${intent.prefer.join(', ')}.` : '');

  return { intent, route, explanation };
}

// ───────────────────────────────────────────────────────────────
// HTTP server (optional — library users can import navigate() directly)
// ───────────────────────────────────────────────────────────────

const app = new Hono();

app.use('*', cors());

app.get('/', (c) =>
  c.json({
    name: 'OpenNavAgent',
    version: '0.1.0',
    skills: listSkillsDetailed(),
    docs: 'https://github.com/daniel2k00/opennavagent#readme',
  })
);

app.get('/healthz', async (c) => {
  const valhalla = await isValhallaReady();
  return c.json(
    { status: valhalla ? 'ok' : 'valhalla-not-ready', valhalla, skills: listSkills().length },
    valhalla ? 200 : 503
  );
});

app.get('/skills', (c) => c.json({ skills: listSkillsDetailed() }));

app.post('/route', async (c) => {
  const body = await c.req.json<NavRequest>();
  if (!body.text) return c.json({ error: 'Missing "text" field' }, 400);
  try {
    const result = await navigate(body);
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  await ensureValhalla();
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port });
  console.log(`🧠 OpenNavAgent listening on http://localhost:${port}`);
  const skills = listSkills();
  console.log(`   Skills loaded: ${skills.join(', ') || '(none yet — try /add-coastal-routing)'}`);
}

export { app };
