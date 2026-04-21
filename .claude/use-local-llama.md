# /use-local-llama — Run OpenNavAgent fully offline with Ollama

You are Claude/Cursor switching this OpenNavAgent install to a **fully local**
LLM via Ollama. After this playbook runs, no network calls leave the machine for
intent parsing — only the (also-local) Valhalla container answers route queries.

## Why

- Zero per-request cost.
- No API key, no rate limits, no vendor lock-in.
- Good for dev, air-gapped demos, and anyone who prefers not to ship prompts off-device.

## Trade-offs the user MUST understand before installing

Small local models (≤ 8B params) are significantly worse than frontier APIs at
**nuanced structured output**. Empirically:

- `origin` / `destination` / `mode` — reliable on `llama3.2:3b` and up.
- `avoid` / `prefer` / `waypoints` — spotty. Small models often leave these
  empty even when the user clearly asked for "no highways" or "scenic route".

Translation: the route will go from A to B, but skill-flavoured preferences
("coastal", "mood:chill", etc.) may not get picked up. For full fidelity use
an API model or a 70B+ local model.

State this trade-off clearly to the user before you install.

## 1. Install Ollama

- macOS: `brew install ollama`
- Linux: `curl -fsSL https://ollama.com/install.sh | sh`
- Windows: download from https://ollama.com/download

Confirm with `ollama --version`.

## 2. Start the Ollama server

In a dedicated terminal (or as a background service):

```bash
ollama serve
```

Verify it's up: `curl -s http://localhost:11434/api/version` should return JSON.

## 3. Pull a model

Recommended default (~2 GB, very fast, reliable for origin/destination):

```bash
ollama pull llama3.2:3b
```

For better fidelity on `avoid` / `prefer` (trade ~5 GB disk, slower first token):

```bash
ollama pull qwen2.5:7b
# or
ollama pull llama3.1:8b
```

## 4. Point OpenNavAgent at Ollama

Edit `.env` and set:

```env
OPENNAVAGENT_MODEL=ollama:llama3.2:3b
# Optional — only set this if your Ollama is not on the default port:
# OLLAMA_URL=http://localhost:11434/v1
```

If `.env` still has `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`, leave them —
they're ignored once `OPENNAVAGENT_MODEL` points at Ollama.

## 5. Restart OpenNavAgent

```bash
npm run dev
```

## 6. Smoke test

Verify intent parsing hits the local model:

```bash
curl -s -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{"text":"drive from 37.7749,-122.4194 to 36.6002,-121.8947"}' | jq .intent
```

Expected: an `origin` / `destination` pair that round-trips your coordinates.

## How it works under the hood (FYI)

The core ships three providers in `src/intent.ts` and picks one from
`OPENNAVAGENT_MODEL`:

- `anthropic:<model>` → Anthropic Messages API
- `openai:<model>`    → OpenAI Chat Completions
- `ollama:<model>`    → OpenAI-compatible adapter pointed at `OLLAMA_URL`

For the `ollama:` case the agent automatically asks `generateObject` for strict
JSON mode, which noticeably improves schema compliance with small models.

## If something fails

- `Connection refused` → `ollama serve` isn't running.
- `model ... not found` → re-run `ollama pull <name>`.
- Empty / nonsense Intents → try a bigger model (`qwen2.5:7b` is a solid upgrade).
- Very slow responses → first call warms the model into VRAM; subsequent calls
  are much faster.
