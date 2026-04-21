# /add-coastal-routing — Install coastal routing skill

You are Claude/Cursor installing the "coastal routing" skill into this OpenNavAgent fork.

This is the canonical example skill. It teaches OpenNavAgent to understand requests like:

> "Take me along the coast, I want the sea on my right."

## What this skill does

1. **Intent layer**: Adds "coastal" as a recognized preference in the parser's system prompt, so the LLM extracts it into `intent.prefer`.
2. **Planner layer**: When `"coastal"` is in `intent.prefer`, mutates the Valhalla request to soft-prefer smaller touristic roads (often coastal in coastal regions) using Valhalla's built-in costing knobs.

## Files to create

### `skills/coastal-routing/index.js`

```js
const skill = {
  name: 'coastal-routing',
  description: 'Recognizes "coastal / along the sea" requests and biases routing toward smaller touristic roads.',

  intentPrompt: `The user may ask for a "coastal" / "along the sea" / "by the water" route.
When they do, add "coastal" to the intent's \`prefer\` array.
Do not add it unless the user explicitly mentioned water/coast/sea/beach.`,

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

## Verify

1. Restart: `npm run dev`
2. You should see `Skills loaded: coastal-routing` (plus anything else installed).
3. Test:
   ```bash
   curl -s -X POST http://localhost:3000/route \
     -H "Content-Type: application/json" \
     -d '{"text":"take me along the coast from San Francisco to Monterey, no highways"}' | jq
   ```
   The response's `intent.prefer` should include `"coastal"`.

## What to tell the user

- The skill is installed and active.
- It's ~20 lines — they can read `skills/coastal-routing/index.js` in under a minute.
- To uninstall: `rm -rf skills/coastal-routing` and restart. That's it.
- This skill is a template — encourage them to copy it as the starting point for their own.
