# Working on OpenNavAgent

This file is the primary instruction set for Claude Code / Cursor when modifying this repo.

## What is OpenNavAgent

An open-source AI navigation agent. It turns free-text ("take me along the coast, no highways") into a real route, by combining a small intent parser (LLM) with a real routing engine (Valhalla on OpenStreetMap).

## Non-negotiable rules

1. **Keep the core small.** The six files in `src/` must stay under ~1,000 lines total (currently ~410). If a change would push past that, the change belongs in a skill, not the core.
2. **Skills extend, features don't.** New capability? Create a `.claude/add-<thing>.md` skill. Do not add it to `src/`.
3. **No config files.** If behavior should change, change code. Period.
4. **Model-agnostic.** Never hardcode Anthropic/OpenAI anywhere. Always go through `@ai-sdk/*` adapters selected from `OPENNAVAGENT_MODEL`.
5. **Zero runtime surprises.** The core must run with just `npm install && npm run dev` after Valhalla is up.

## Codebase map

```
src/
├── index.ts      # Orchestrator. HTTP server + navigate() function.
├── intent.ts     # Vercel AI SDK → Zod-validated Intent.
├── planner.ts    # Intent → Valhalla request → Route.
├── skills.ts     # Discovers + loads skills from ./skills/*/index.js
├── container.ts  # Thin wrapper over `docker compose` for Valhalla.
└── types.ts      # Shared Zod schemas and types.

docker/
└── docker-compose.yml  # Valhalla sidecar with OSM data volume.

.claude/          # Skill definitions (Markdown playbooks).
skills/           # Compiled skills (created at install time).
routes/           # Per-route memory (like nanoclaw groups).
```

## How skills work

- A skill is a directory under `skills/<name>/` with an `index.ts` that default-exports a `Skill` object (see `src/skills.ts`).
- Installing a skill = running its Markdown playbook from `.claude/add-<name>.md` which tells Claude to create that directory and any other edits.
- Skills can:
  - Inject extra instructions into the intent parser (`intentPrompt`)
  - Mutate the Valhalla request (`transformRoute`)
- Skills load automatically at startup — no registry edits needed.

## Common tasks

- **Add a skill**: Create `.claude/add-<name>.md` describing every edit. Follow the structure in `.claude/add-coastal-routing.md`.
- **Run locally**: `npm run valhalla:up && npm run dev`
- **Debug routing**: Hit `http://localhost:8002/status` (Valhalla). If it's not ready, `npm run valhalla:logs`.
- **Switch model**: Edit `OPENNAVAGENT_MODEL` in `.env` (e.g. `openai:gpt-4o-mini`).

## What NOT to do

- Don't install heavy dependencies in the core. If you need it, it's a skill.
- Don't add `eslint`, `prettier`, `husky`, `jest`, or any tooling to the core. Opinions go in skills.
- Don't split files. One concept, one file. If `intent.ts` grows past 200 lines, the right answer is probably a skill.
- Don't invent config. Hardcode sensible defaults; skills can change them.

## When you're unsure

Ask yourself: "Is this a core navigation primitive, or a flavor someone might want?" If the latter — skill.

## Skills vs. data vs. config — the hierarchy

When a user asks for something, decide in this order:

1. **Is it just a new value in an existing structure?** (e.g. new country, new mood, new coffee type)
   → Edit the relevant file. Not a skill. Not a PR. Just edit.

2. **Is it a config knob on an existing capability?** (e.g. switch LLM provider, change region)
   → `.env` or `docker-compose.yml`. Not a skill.

3. **Is it a new dimension / new behavior?** (e.g. weather routing, voice, mood)
   → Skill. Create `.claude/add-<name>.md` and `skills/<name>/index.js`.

Don't fragment. One skill that owns a dimension (like `mood-routing` owning all moods) is better than 20 skills each owning a value.

## Naming convention

The project's package name is `opennavagent` (all lowercase, no dashes). The display name is `OpenNavAgent`. Types and function names use standard camelCase (e.g. `NavRequest`, `NavResponse`).
