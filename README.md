# 🧠 OpenNavAgent

> **Tell your map what you actually want. In English.**
>
> *"Take me from San Francisco to Monterey along the coast, no highways, stop for coffee somewhere nice."*
>
> OpenNavAgent turns that sentence into a real route — on a real map, on your own server.
>
> Self-hosted. Open-source. A brain you can read in 30 minutes — ~400 lines of TypeScript.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![CI](https://github.com/daniel2k00/opennavagent/actions/workflows/ci.yml/badge.svg)](https://github.com/daniel2k00/opennavagent/actions/workflows/ci.yml)

---

OpenNavAgent is the *brain* that sits on top of open-source mapping tools (OpenStreetMap + Valhalla) and turns natural-language requests into real routes. The LLM doesn't just format the output — it **decides how to route**.

```
"Take me through the coast, no highways, stop for coffee somewhere nice."
                              │
                              ▼
                     ┌─────────────────┐
                     │  OpenNavAgent   │  ◀── ~400 lines, 6 files
                     │   (the brain)   │
                     └────────┬────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
          Valhalla (OSM)            Your LLM (Claude/GPT/Llama)
          routing engine             intent + personality
```

---

## What OpenNavAgent gives you

**1. Natural language as the routing primitive.**
Your user writes *"scenic route, no highways, short coffee stop"* — the LLM parses intent, the planner shapes a Valhalla request, and the route comes back in seconds. The LLM doesn't just format the output. It decides *how to route*.

**2. A brain you can actually read.**
Six files. ~410 lines of TypeScript. Fork it in the morning, understand every line by lunch. No hidden SaaS, no magic black box — every decision your agent makes is traceable to a file you can edit.

**3. Skills, not features.**
Need cycling support? EV-charger routing? Voice input? Wheelchair-accessible paths? Mood-based routes? Don't patch the core — drop a Markdown playbook in `.claude/` and a JS file in `skills/`. The core stays small forever. One bad skill can't take the server down.

**4. Yours to run.**
Self-hosted on your own hardware, your own domain, your own rate limits. No per-request billing, no vendor locking you out of an API you built on. The only external bill is your LLM provider — and `/use-local-llama` removes that too.

> **Rough economics.** A team sending 1M routing calls per month pays roughly **~$5,000** with Google Directions and **~$500–$2,000** with Mapbox ([Google pricing](https://developers.google.com/maps/billing-and-pricing/pricing), [Mapbox pricing](https://www.mapbox.com/pricing)). With OpenNavAgent you pay for a VPS and your LLM tokens — everything else is open source.

---

## Quick Start

```bash
# 1. Fork + clone
gh repo fork daniel2k00/opennavagent --clone && cd opennavagent

# 2. Let Cursor handle setup
cursor .
# Inside Cursor, run: /setup

# 3. Send your first request
curl -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{"text":"drive from 37.7749,-122.4194 to 36.6002,-121.8947 avoiding highways"}'
```

For address-based routing (`"from 1 Market Street San Francisco to Cannery Row Monterey"`), install the geocoder:

```
/add-geocoding
```

---

## Architecture

Six files. That's the whole brain.

| File | Role | Lines |
|---|---|---|
| `src/index.ts` | HTTP server + `navigate()` orchestrator | ~80 |
| `src/intent.ts` | LLM → structured Intent (Zod) | ~50 |
| `src/planner.ts` | Intent → Valhalla route + geocoding fallback | ~90 |
| `src/skills.ts` | Runtime plugin loader w/ per-skill isolation | ~90 |
| `src/container.ts` | Non-blocking Valhalla lifecycle | ~55 |
| `src/types.ts` | Shared types (Zod) | ~50 |

**That's ~410 lines.** Everything else (geocoding, voice, mood, coastal routing…) is a skill.

### HTTP endpoints

| Method + Path | Purpose |
|---|---|
| `GET /` | Name, version, installed skills with descriptions |
| `GET /healthz` | 200 when Valhalla is up; 503 while tiles are building |
| `GET /skills` | Detailed skill list (name + description) |
| `POST /route` | Natural-language routing — `{text, context?}` → `{intent, route, explanation}` |

---

## Skills

Skills live in `.claude/*.md`. Each one is a Markdown playbook telling Claude/Cursor exactly how to modify your fork.

### Shipped playbooks

| Skill | What it does |
|---|---|
| `/setup` | First-time setup: Docker check, Valhalla bootstrap, `.env` scaffolding |
| `/use-local-llama` | Swap the LLM for a local Ollama model — $0 per request, no vendor |
| `/add-geocoding` | Adds Nominatim so you can ask for real addresses, not just `lat,lon` |
| `/add-coastal-routing` | Adds "take me along the coast" intent + Valhalla weighting |
| `/add-mood-routing` | Route by mood: `chill`, `focused`, `adventurous`, `romantic`, `safe` |

More niche playbooks (e.g. emergency-shelter routing) live in `.claude/` and can be enabled on demand — see the folder for the full list.

### Planned (RFS — Request for Skills)

- `/add-voice` — Whisper (STT) + TTS for hands-free use
- `/add-scenic-routing` — Prefer roads with scenic viewpoints from OSM tags
- `/add-realtime-reroute` — Re-plan mid-trip based on conversation
- `/add-traffic` — Live traffic re-weighting (TomTom / HERE / Waze-style)
- `/add-calendar` — Build routes around your Google/Apple calendar

**Want one?** Open an issue with the label `rfs`.

### Skill anatomy

A skill is a `./skills/<name>/index.js` file exporting a `Skill` object with up to four optional hooks:

```js
const skill = {
  name: 'coastal-routing',
  description: 'Bias the route toward touristic coastal roads.',
  intentPrompt: 'Add "coastal" to intent.prefer when the user mentions sea / coast / beach.',
  transformRoute(request, intent) { /* mutate Valhalla request */ },
  resolveLocation(place) { /* return {lat, lon} | null */ },
};
export default skill;
```

That's the whole API. One bad skill won't crash the server — each is loaded in its own `try`/`catch`.

---

## Using OpenNavAgent in Your App

OpenNavAgent is both a **library** and a **server**.

### As a library

```ts
import { navigate } from 'opennavagent';

const result = await navigate({
  text: 'coastal route from San Francisco to Monterey, no tolls',
  context: { currentLocation: { lat: 37.7749, lon: -122.4194 } },
});

console.log(result.route.summary);    // "193 km, ~2 h 40 min"
console.log(result.explanation);      // Human-readable plan
```

### As a service

```bash
npm run dev
# → POST http://localhost:3000/route (CORS enabled)
```

---

## Contributing

**Don't add features to the core. Add skills.**

If you want to support, say, cycling-specific routing:

1. Fork OpenNavAgent
2. Create a `skill/cycling` branch
3. Add `.claude/add-cycling.md` with instructions for Claude/Cursor
4. Open a PR

Users who want the skill run `/add-cycling` in their own fork and get *only* that feature — no bloat.

The base codebase accepts **only** security fixes, bug fixes, and clear improvements. Everything else is a skill.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full rules (including the 3-question test for when something should be a skill vs. a data edit).

---

## Requirements

- Node.js ≥ 20
- Docker (for Valhalla)
- An LLM API key (Anthropic or OpenAI) — or Ollama locally via `/use-local-llama`

---

## License

Apache 2.0. Do what you want, just don't blame us if the route takes you into the sea.
