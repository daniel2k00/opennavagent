# /add-shelter-routing — Install shelter-aware routing skill

You are Claude/Cursor installing the "shelter routing" skill. This skill biases routes to stay close to public bomb shelters (OSM `amenity=shelter`). Built with Israel in mind but works anywhere OSM has shelters mapped.

## Why this is a skill (and not a mood)

A mood just tweaks Valhalla costing parameters. Shelter routing needs:
- External data (Overpass API query to OpenStreetMap)
- Async fetching
- Waypoint injection

That's a new dimension, not a new mood value. Hence: skill.

## Dependency check

This skill requires OpenNavAgent core to support async `transformRoute`. If you see a TypeScript error about `Promise<any>` not being assignable to `any`, the core hasn't been updated. Check `src/skills.ts`:

```ts
transformRoute?: (request: any, intent: Intent) => any | Promise<any>;
```

And `src/skills.ts` `applyPlannerSkills` must be async and awaited in `src/planner.ts`.

## Files to create

### `skills/shelter-routing/index.js`

Copy the full contents from the shipped skill. Key behavior:

1. Triggered when `intent.prefer` includes `"shelter-aware"`.
2. Computes bounding box from origin + destination (+2km padding).
3. Queries Overpass API for `amenity=shelter` nodes in that box.
4. Picks up to 3 shelters spaced evenly along the straight-line route.
5. Injects them as `"through"` waypoints in the Valhalla request.

## Configuration

Optional environment variable:

```bash
OVERPASS_URL=https://overpass-api.de/api/interpreter   # Default public instance
# Or run your own: https://github.com/wiktorn/Overpass-API
```

For high-traffic deployments, **self-host Overpass** — the public instance is rate-limited and you'll be a bad citizen.

## Intent trigger phrases

The skill's `intentPrompt` teaches the LLM to set `prefer: ["shelter-aware"]` when the user says things like:

- "route through shelters"
- "wartime safe route"
- "I want to pass near bomb shelters"
- "מקלטים ציבוריים"
- "ניווט בטוח מבחינת מלחמה"

It does **not** trigger on general "safe" requests — those go to `mood:safe` in the mood-routing skill. The two skills compose: you can have `mood:safe` AND `shelter-aware` at the same time.

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

- OSM shelter coverage in Israel is partial. Consider adding a secondary data source (e.g. GOV.IL public shelter registry) via a follow-up skill: `/add-gov-il-shelters`.
- Current implementation uses straight-line spacing. A smarter version would call Valhalla twice: first for the base route, then pick shelters closest to that route's geometry.
- No real-time rocket-alert integration. That would be `/add-rocket-alerts`.

## What to tell the user

- The skill is active. Requests that mention shelters will route through them.
- Coverage depends on OSM. If they find missing shelters, they should contribute them to OpenStreetMap — it helps everyone.
- For production use, they should self-host Overpass.
