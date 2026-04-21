# /add-mood-routing — Install mood-based routing skill

You are Claude/Cursor installing the "mood routing" skill — the feature that makes OpenNavAgent feel magical. Instead of routing by distance or time, it routes by how the user wants to *feel* on the drive.

## What this skill does

Adds a `mood` dimension to the intent and translates it into concrete routing preferences.

| Mood | Behavior |
|---|---|
| `chill` | Avoid highways and traffic, prefer smaller/quieter roads, tolerate +20% time |
| `focused` | Fastest route, highways OK, minimize turns |
| `adventurous` | Prefer unusual/non-obvious routes, back roads, scenic preferences |
| `romantic` | Similar to chill, but also upweights "coastal" and "scenic" flags |
| `safe` | Prefer main, well-lit, widely-used roads; avoid isolated tracks/living streets. Compose with `/add-shelter-routing` for wartime safety. |

## Files to create

### `skills/mood-routing/index.js`

```js
const MOODS = {
  chill: {
    use_highways: 0.1,
    maneuver_penalty: 3,
    country_crossing_penalty: 5,
  },
  focused: {
    use_highways: 1.0,
    maneuver_penalty: 8,
  },
  adventurous: {
    use_highways: 0.2,
    use_tolls: 0.2,
    maneuver_penalty: 0.5,
  },
  romantic: {
    use_highways: 0.1,
    use_tolls: 0.1,
    maneuver_penalty: 2,
  },
  // Prefer main, well-lit, widely-used roads. Avoids tracks and isolated
  // rural shortcuts. Combine with /add-shelter-routing for wartime safety.
  safe: {
    use_highways: 0.8,
    use_tracks: 0,
    use_living_streets: 0.2,
    maneuver_penalty: 3,
  },
};

const skill = {
  name: 'mood-routing',

  intentPrompt: `
If the user expresses a mood or feeling about the drive (e.g. "I'm stressed",
"something relaxing", "I want adventure", "a romantic drive"), add one of
these values to the intent's \`prefer\` array as "mood:<value>":
  - mood:chill          (relaxed, low-stress, quiet)
  - mood:focused        (goal-oriented, efficient)
  - mood:adventurous    (exploratory, novel, off-beat)
  - mood:romantic       (scenic, slow, beautiful)
  - mood:safe           (prefer main/well-lit/widely-used roads; avoid isolated tracks)
Only add one mood. Only add it if the user clearly expressed a feeling.
`.trim(),

  transformRoute(request, intent) {
    const moodPref = intent.prefer.find((p) => p.startsWith('mood:'));
    if (!moodPref) return request;
    const mood = moodPref.slice(5);
    const overrides = MOODS[mood];
    if (!overrides) return request;

    const costing = request.costing ?? 'auto';
    request.costing_options = request.costing_options ?? {};
    request.costing_options[costing] = {
      ...(request.costing_options[costing] ?? {}),
      ...overrides,
    };
    return request;
  },
};

export default skill;
```

## Verify

1. Restart: `npm run dev`
2. You should see `Skills loaded: mood-routing` (and any other installed skills).
3. Test:
   ```bash
   curl -s -X POST http://localhost:3000/route \
     -H "Content-Type: application/json" \
     -d '{"text":"I am exhausted, take me home to 32.08,34.78 from 32.79,34.99 — something calm"}' | jq .intent
   ```
   You should see `"prefer": ["mood:chill"]`.

## What to tell the user

- This is the bidirectional bridge between feelings and road choices — nothing else in the OSS navigation world does this.
- Encourage them to tune the `MOODS` table to their taste. It's literally 20 lines.
- Combine it with `/add-coastal-routing` for compounding effects.
