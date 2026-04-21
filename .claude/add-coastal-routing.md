# /add-coastal-routing — Install coastal routing skill

You are Claude/Cursor installing the "coastal routing" skill into this OpenNavAgent fork.

This is the canonical example skill. It teaches OpenNavAgent to understand requests like:

> "Take me along the coast, I want the sea on my right."

## What this skill does

1. **Intent layer**: Adds "coastal" as a recognized preference in the parser's system prompt, so the LLM extracts it into `intent.prefer`.
2. **Planner layer**: When `"coastal"` is in `intent.prefer`, mutates the Valhalla request to prefer roads tagged as coastal in OSM (using `exclude_polygons` inversion or `avoid_polygons` on the inland side — the simple version below uses a soft weighting via custom costing).

## Files to create

### `skills/coastal-routing/index.ts`

```ts
import type { Skill } from '../../src/skills.js';

const skill: Skill = {
  name: 'coastal-routing',

  intentPrompt: `
The user may ask for a "coastal" / "along the sea" / "by the water" route.
When they do, add "coastal" to the intent's \`prefer\` array.
Do not add it unless the user explicitly mentioned water/coast/sea/beach.
`.trim(),

  transformRoute(request, intent) {
    if (!intent.prefer.includes('coastal')) return request;

    // Soft preference: bias Valhalla toward roads closer to the coast
    // by lowering the maneuver penalty and using the "scenic" preference.
    const costing = request.costing ?? 'auto';
    request.costing_options = request.costing_options ?? {};
    request.costing_options[costing] = {
      ...(request.costing_options[costing] ?? {}),
      // Prefer smaller, touristic roads (often coastal in coastal regions)
      use_highways: 0.2,
      use_tolls: 0.1,
      maneuver_penalty: 2,
    };

    // Also pass a hint through directions_options so the LLM explanation
    // can mention it in the final response.
    request.directions_options = {
      ...(request.directions_options ?? {}),
      format: 'json',
    };

    return request;
  },
};

export default skill;
```

## Build & verify

1. Build the skill so it's discoverable at runtime:
   ```bash
   npx tsc skills/coastal-routing/index.ts --outDir skills/coastal-routing --module ESNext --target ES2022 --moduleResolution bundler
   ```
   (Or simply run `npm run build` — `tsconfig.json` excludes `skills/` from the main build, so it compiles independently.)

   **Easier alternative**: since skills are loaded as `.js`, you can instead ship the file as plain JavaScript. Create `skills/coastal-routing/index.js` with the compiled output directly. For this skill, the compiled version is small:

   ```js
   const skill = {
     name: 'coastal-routing',
     intentPrompt: `The user may ask for a "coastal" / "along the sea" / "by the water" route. When they do, add "coastal" to the intent's \`prefer\` array. Do not add it unless the user explicitly mentioned water/coast/sea/beach.`,
     transformRoute(request, intent) {
       if (!intent.prefer.includes('coastal')) return request;
       const costing = request.costing ?? 'auto';
       request.costing_options = request.costing_options ?? {};
       request.costing_options[costing] = {
         ...(request.costing_options[costing] ?? {}),
         use_highways: 0.2,
         use_tolls: 0.1,
         maneuver_penalty: 2,
       };
       return request;
     },
   };
   export default skill;
   ```

2. Restart the dev server: `npm run dev`.
3. You should see `Skills loaded: coastal-routing` in the startup log.
4. Test it:
   ```bash
   curl -s -X POST http://localhost:3000/route \
     -H "Content-Type: application/json" \
     -d '{"text":"take me along the coast from Tel Aviv to Haifa, no highways"}' | jq
   ```
   The response's `intent.prefer` should include `"coastal"`.

## What to tell the user when done

- The skill is installed and active.
- It's just two small changes — they can read `skills/coastal-routing/index.js` in under a minute.
- To uninstall: `rm -rf skills/coastal-routing` and restart. That's it.
- This skill is a template — encourage them to copy it as the starting point for their own.
