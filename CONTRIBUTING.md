# Contributing to OpenNavAgent

**Don't add features. Add skills.**

That's the single most important rule here. OpenNavAgent's core exists to stay small enough to read in 30 minutes. Every capability beyond "text → intent → route" is a skill.

## What the base codebase accepts

Only:

1. **Security fixes**
2. **Bug fixes** (something the core claims to do but doesn't)
3. **Clear improvements** (reduces code, improves clarity, fixes architecture)

Everything else is a skill.

## When is something a skill?

**Rule of thumb: skills are for new *dimensions* or *behaviors* — not for new *values* in an existing dimension.**

| Request | Skill? | What to do instead |
|---|---|---|
| Add support for a new country's map | ❌ | Edit `tile_urls` in `docker-compose.yml` |
| Add a new mood (e.g. `zen`) | ❌ | Add to `MOODS` table in `skills/mood-routing/index.js` |
| Add a new LLM provider via existing SDK | ❌ | Set `OPENNAVAGENT_MODEL` in `.env` |
| Run multiple regions simultaneously | ✅ | `/add-multi-region` |
| Route by weather | ✅ | `/add-weather-routing` |
| Route by time of day | ✅ | `/add-time-of-day-routing` |
| Add Ollama / local models | ✅ | `/use-local-llama` (needs a proxy) |
| Add voice input/output | ✅ | `/add-voice` |

### The 3-question test

Before opening a skill PR, ask:

1. **Code or values?** If it's only new values, it's config or a data edit — not a skill.
2. **Could there be hundreds of these?** If yes (countries, moods, coffee types), it's data inside an existing skill, not 100 separate skills.
3. **Does it stand alone?** If it's a small tweak to existing logic, just edit the relevant file.

## How to propose a new skill

1. Open an issue with the label `rfs` (Request for Skills) describing the behavior.
2. Community discusses.
3. Once there's consensus, fork OpenNavAgent and create a branch named `skill/<name>`.
4. Add `.claude/add-<name>.md` — a Markdown playbook that tells Claude/Cursor exactly how to install the skill into a user's fork.
5. Open a PR.

The PR will **not** be merged into `main`. Instead, the maintainer will:

- Review the skill's markdown playbook.
- Keep the `skill/<name>` branch as-is on the repo.
- Users who want the skill run `/add-<name>` in their own fork, which applies the playbook.

This is how we stay clean.

## Skill playbook structure

Every `.claude/add-<name>.md` must have:

1. **Header**: one sentence describing the skill.
2. **What this skill does**: the high-level behavior.
3. **Files to create**: concrete code blocks Cursor can copy.
4. **Verify**: a curl command or similar that proves it works.
5. **What to tell the user**: UX guidance for Cursor to report success.

See `.claude/add-coastal-routing.md` for the canonical example.

## Core code style

- TypeScript, strict mode, no `any` where avoidable.
- Zod for every external-facing data shape.
- No classes. Functions and interfaces.
- No global state except the skills registry.
- Comments explain *why*, not *what*.

## Size budgets (non-negotiable)

| Scope | Budget |
|---|---|
| Any file in `src/` | ≤ 200 lines |
| `src/` total | ≤ 1,000 lines |
| Core dependencies | ≤ 6 runtime deps |

If your change blows a budget, reconsider.

## Running locally

```bash
npm install
cp .env.example .env  # fill in a key
npm run valhalla:up   # ~5-30 min first time
npm run dev
```

## Licensing

By contributing, you agree your contribution is licensed under Apache 2.0.
