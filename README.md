# 🧠 OpenNavAgent

> **Open-source AI navigation agent. Natural-language routing on OpenStreetMap. Skills-based for maps.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

OpenNavAgent is the *brain* that sits on top of open-source mapping tools (OpenStreetMap, Valhalla) and turns natural-language requests into real routes.

```
"Take me through the coast, no highways, stop for coffee somewhere nice."
                              │
                              ▼
                     ┌─────────────────┐
                     │  OpenNavAgent   │  ◀── ~1,000 lines of TypeScript
                     │   (the brain)   │
                     └────────┬────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
          Valhalla (OSM)            Your LLM (Claude/GPT/Llama)
          routing engine             intent + personality
```

---

## Why OpenNavAgent

Every existing option is missing at least one of the things you need:

| | AI-native | Open source | For human drivers | Skills-based |
|---|---|---|---|---|
| Google Maps / Waze | Chat layer only | ❌ | ✅ | ❌ |
| Valhalla / OSRM / GraphHopper | ❌ | ✅ | ✅ | ❌ |
| OsmAnd / CoMaps | ❌ | ✅ | ✅ | ❌ |
| Academic LLM-navigation | ✅ | ✅ | ❌ (robots/AVs) | ❌ |
| **OpenNavAgent** | **✅** | **✅** | **✅** | **✅** |

---

## Philosophy

OpenNavAgent borrows its philosophy from [`nanoclaw`](https://github.com/qwibitai/nanoclaw):

- **Small enough to understand.** The entire core is 6 files and under 1,000 lines. Read it in 30 minutes.
- **Skills over features.** Want "mood-based routing"? Don't PR a feature — run `/add-mood-routing` and your fork grows the skill. Cleaner code, zero bloat.
- **Bespoke, not monolithic.** Fork OpenNavAgent and let Cursor/Claude Code modify it to fit *your* exact use case.
- **AI-native.** No setup wizard. No config files. Ask Cursor to set it up, ask Cursor to debug it, ask Cursor to extend it.
- **Secure by isolation.** The routing engine runs in a Docker container. Your LLM calls go through your own API key.
- **Model-agnostic.** Claude, GPT, Llama, Ollama — via Vercel AI SDK.

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
  -d '{"text":"drive from 32.0853,34.7818 to 32.7940,34.9896 avoiding highways"}'
```

That's it. You'll get back a structured intent, a full route, and a human explanation.

---

## Architecture

Six files. That's the whole brain.

| File | Role | Lines |
|---|---|---|
| `src/index.ts` | Orchestrator + HTTP server | ~70 |
| `src/intent.ts` | LLM → structured intent | ~40 |
| `src/planner.ts` | Intent → Valhalla route | ~90 |
| `src/skills.ts` | Runtime plugin loader | ~60 |
| `src/container.ts` | Valhalla lifecycle | ~40 |
| `src/types.ts` | Shared types (Zod) | ~50 |

**That's ~350 lines.** Everything else (geocoding, voice, mood, coastal, shelter routing…) is a skill.

---

## Skills

Skills live in `.claude/*.md`. Each one is a Markdown document telling Claude/Cursor exactly how to modify your fork.

### Shipped skills

| Skill | What it does |
|---|---|
| `/setup` | First-time setup: Docker check, Valhalla bootstrap, `.env` scaffolding |
| `/add-coastal-routing` | Adds "take me along the coast" intent + Valhalla weighting |
| `/add-mood-routing` | Route by mood: `chill`, `focused`, `adventurous`, `romantic`, `safe` |
| `/add-shelter-routing` | Wartime routing — passes through OSM public shelters (`amenity=shelter`) |

### Planned (RFS — Request for Skills)

- `/add-voice` — Whisper (STT) + TTS for hands-free use
- `/add-scenic-routing` — Prefer roads with scenic viewpoints from OSM tags
- `/add-geocoding` — Swap the "lat,lon-only" stub for Nominatim/Photon
- `/add-realtime-reroute` — Re-plan mid-trip based on conversation
- `/add-rocket-alerts` — Real-time integration with Israeli Home Front Command alerts
- `/use-local-llama` — Run fully local with Ollama
- `/add-calendar` — Build routes around your Google/Apple calendar

**Want one?** Open an issue with the label `rfs`.

---

## Using OpenNavAgent in Your App

OpenNavAgent is both a **library** and a **server**.

### As a library

```ts
import { navigate } from 'opennavagent';

const result = await navigate({
  text: 'coastal route from Tel Aviv to Haifa, no tolls',
  context: { currentLocation: { lat: 32.08, lon: 34.78 } },
});

console.log(result.route.summary);    // "94.2 km, ~78 min"
console.log(result.explanation);       // Human-readable plan
```

### As a service

```bash
npm run dev
# → POST http://localhost:3000/route
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
