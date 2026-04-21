# /add-shelter-routing — Install shelter-aware routing skill

You are Claude/Cursor installing the "shelter routing" skill. This skill
biases routes to pass near public shelters tagged as `amenity=shelter` in
OpenStreetMap — works anywhere the local community has mapped them (bomb
shelters, storm shelters, mountain huts, etc.).

## Why this is a skill (and not a mood)

A mood just tweaks Valhalla costing parameters. Shelter routing needs:

- External data (Overpass API query to OpenStreetMap)
- Async fetching with a timeout
- Waypoint injection

That's a new dimension, not a new mood value. Hence: skill.

## Intent trigger phrases

The skill's `intentPrompt` teaches the LLM to set `prefer: ["shelter-aware"]` when the user says things like:

- "route through shelters"
- "wartime safe route"
- "I want to pass near bomb shelters"
- "מקלטים ציבוריים"
- "ניווט בטוח מבחינת מלחמה"

It does **not** trigger on general "safe" requests — those go to `mood:safe`
in the mood-routing skill. The two compose: you can have `mood:safe` AND
`shelter-aware` at the same time.

## Configuration

Optional environment variable:

```bash
OVERPASS_URL=https://overpass-api.de/api/interpreter   # Default public instance
```

For high-traffic deployments, **self-host Overpass** — the public instance
is rate-limited and you'll be a bad citizen.

## Files to create

### `skills/shelter-routing/index.js`

```js
/**
 * Shelter routing — biases the route to stay close to public shelters.
 *
 * Strategy:
 *  1. Compute a bounding box from origin + destination (+2km padding).
 *  2. Query Overpass for all `amenity=shelter` nodes in that box.
 *  3. Pick shelters spaced evenly along the origin→destination line and
 *     inject them into Valhalla as "through" waypoints.
 *  4. Valhalla then routes through those points — forcing the path to
 *     stay near shelters the whole way.
 */

const OVERPASS_URL = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';
const OVERPASS_TIMEOUT_MS = 15_000;
const MAX_SHELTER_WAYPOINTS = 3; // Valhalla allows up to 50 locations; keep small.
const BBOX_PADDING_DEG = 0.02;   // ~2km padding around origin/dest bbox.

async function fetchShelters(minLat, minLon, maxLat, maxLon) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="shelter"](${minLat},${minLon},${maxLat},${maxLon});
      node["shelter_type"="public"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out body;
  `.trim();

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query,
    signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.elements ?? [])
    .filter((e) => typeof e.lat === 'number' && typeof e.lon === 'number')
    .map((e) => ({ lat: e.lat, lon: e.lon }));
}

function pickEvenlySpacedAlongLine(origin, destination, shelters, count) {
  if (shelters.length === 0) return [];

  const targets = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    targets.push({
      lat: origin.lat + (destination.lat - origin.lat) * t,
      lon: origin.lon + (destination.lon - origin.lon) * t,
    });
  }

  const used = new Set();
  const picked = [];
  for (const target of targets) {
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < shelters.length; i++) {
      if (used.has(i)) continue;
      const dLat = shelters[i].lat - target.lat;
      const dLon = shelters[i].lon - target.lon;
      const dist = dLat * dLat + dLon * dLon;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    if (best >= 0) {
      used.add(best);
      picked.push(shelters[best]);
    }
  }
  return picked;
}

const skill = {
  name: 'shelter-routing',
  description: 'Threads the route through public shelters tagged `amenity=shelter` in OSM.',

  intentPrompt: `
If the user asks for a route that stays near public bomb shelters, or
mentions wartime / rocket alerts / "between shelters" / "I want to feel safe
in case of an alarm" / "מקלטים" / "בטיחות מלחמה", add "shelter-aware" to
the intent's \`prefer\` array. Only add it when the user is explicitly
asking for shelter proximity — not for general "safe driving" (which is
handled by mood:safe in the mood-routing skill).
`.trim(),

  async transformRoute(request, intent) {
    if (!intent.prefer.includes('shelter-aware')) return request;

    const locs = request.locations ?? [];
    if (locs.length < 2) return request;
    const origin = locs[0];
    const destination = locs[locs.length - 1];

    const minLat = Math.min(origin.lat, destination.lat) - BBOX_PADDING_DEG;
    const maxLat = Math.max(origin.lat, destination.lat) + BBOX_PADDING_DEG;
    const minLon = Math.min(origin.lon, destination.lon) - BBOX_PADDING_DEG;
    const maxLon = Math.max(origin.lon, destination.lon) + BBOX_PADDING_DEG;

    try {
      const shelters = await fetchShelters(minLat, minLon, maxLat, maxLon);
      if (shelters.length === 0) {
        console.warn('[shelter-routing] No shelters found in bbox; routing normally.');
        return request;
      }

      const waypoints = pickEvenlySpacedAlongLine(
        origin,
        destination,
        shelters,
        MAX_SHELTER_WAYPOINTS
      );

      const intermediate = waypoints.map((w) => ({
        lat: w.lat,
        lon: w.lon,
        type: 'through',
      }));

      request.locations = [origin, ...intermediate, destination];
      console.log(`[shelter-routing] Injected ${intermediate.length} shelter waypoint(s).`);
    } catch (err) {
      console.warn('[shelter-routing] Overpass query failed; routing normally.', err);
    }

    return request;
  },
};

export default skill;
```

## Verify

1. Restart: `npm run dev`
2. Startup should show `Skills loaded: ..., shelter-routing`
3. Test (assumes Valhalla + a key are configured):

```bash
curl -s -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{"text":"drive from 32.0853,34.7818 to 31.7683,35.2137, stay near public shelters"}' | jq
```

Expect:

- `intent.prefer` contains `"shelter-aware"`
- Server log prints `[shelter-routing] Injected N shelter waypoint(s).`
- The route distance is slightly longer than a direct route.

## Limitations / future work

- OSM shelter coverage in Israel is partial. A follow-up skill could pull
  from the GOV.IL public-shelter registry: `/add-gov-il-shelters`.
- Current implementation uses straight-line spacing. A smarter version would
  call Valhalla twice: first for the base route, then pick shelters closest
  to that route's geometry.
- No real-time rocket-alert integration. That would be `/add-rocket-alerts`.

## What to tell the user

- The skill is active. Requests that mention shelters will route through them.
- Coverage depends on OSM — if they find missing shelters, contribute them
  to OpenStreetMap (helps everyone).
- For production use, self-host Overpass.
