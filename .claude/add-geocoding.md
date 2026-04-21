# /add-geocoding — Install Nominatim geocoding skill

You are Claude/Cursor installing the "geocoding" skill into this OpenNavAgent fork.

## Why this is a skill

The core ships a tiny geocoder that only understands `"lat,lon"` strings and
asks the LLM to emit coordinates for well-known places. That's enough for
hacking but not enough for real addresses. This skill plugs into the
`resolveLocation()` hook in `src/skills.ts` and uses OpenStreetMap's
[Nominatim](https://nominatim.org/) to turn street addresses into coordinates.

## What this skill does

1. Implements the `resolveLocation(place)` hook — first match wins in the skill chain.
2. Hits Nominatim with a 10-second timeout and caches every hit in-memory.
3. Nudges the LLM (via `intentPrompt`) to prefer named places over guessed coords.

## Rate-limit warning (important)

The public Nominatim instance enforces **1 request/second** and bans abusers.
For anything beyond hobby usage, set `NOMINATIM_URL` to a self-hosted instance:

```bash
# in .env
NOMINATIM_URL=http://your-nominatim:8080
```

Self-host it in 15 minutes: https://github.com/mediagis/nominatim-docker.

## Files to create

### `skills/geocoding/index.js`

```js
const NOMINATIM_URL = process.env.NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'OpenNavAgent/0.1 (+https://github.com/daniel2k00/opennavagent)';

const cache = new Map();

async function lookup(place) {
  if (cache.has(place)) return cache.get(place);

  const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    cache.set(place, result);
    return result;
  } catch {
    return null;
  }
}

const skill = {
  name: 'geocoding',
  description: 'Resolves place names and addresses to coordinates via OSM Nominatim (self-hostable).',

  intentPrompt: `A geocoding skill is installed. You MAY output named places or street
addresses as origin/destination (e.g. "1 Market Street, San Francisco") in addition to
"lat,lon" pairs. Prefer named places when you're unsure of exact coordinates.`,

  async resolveLocation(place) {
    return lookup(place);
  },
};

export default skill;
```

## Verify

1. Restart: `npm run dev`
2. Startup should show `Skills loaded: ..., geocoding`
3. Test with a street address:
   ```bash
   curl -s -X POST http://localhost:3000/route \
     -H "Content-Type: application/json" \
     -d '{"text":"drive from 1 Market Street San Francisco to Cannery Row Monterey"}' | jq .intent
   ```
   The route should plan successfully (no "Cannot resolve" error).

## Limitations / future work

- No batch lookups. Two waypoints = two HTTP calls.
- No confidence score surfaced to the user.
- Public Nominatim is slow (1 rps). Self-host for anything serious.

## What to tell the user

- Real addresses now work. Tell them to respect Nominatim's usage policy.
- If they plan >1 req/sec, self-host via [nominatim-docker](https://github.com/mediagis/nominatim-docker).
- To uninstall: `rm -rf skills/geocoding && npm run dev`.
